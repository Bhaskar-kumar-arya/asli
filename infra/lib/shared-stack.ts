import { SSM_PATHS, type BucketName, type TableName } from '@asli/contracts';
import {
  Duration,
  RemovalPolicy,
  Stack,
  aws_apigatewayv2 as apigwv2,
  aws_cognito as cognito,
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  aws_sns as sns,
  aws_sqs as sqs,
  aws_ssm as ssm,
  aws_verifiedpermissions as avp,
  type StackProps,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { ssmName } from './ssm';

/**
 * Owned by T02 (see CLAUDE.md "Infrastructure ownership").
 * Tables, buckets, SNS topics, Cognito, the shared HTTP API, Verified Permissions
 * policy store, the Powertools idempotency table, and a DLQ for stream consumers.
 * Every name/ARN/ID a lane needs is exported to SSM under /asli/<stage>/...
 * (see infra/lib/ssm.ts and packages/contracts/src/ssm.ts SSM_PATHS).
 */
export class SharedStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & { stage: string }) {
    super(scope, id, props);
    const { stage } = props;
    const isInt = stage === 'int';
    const removalPolicy = isInt ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    // ---- DynamoDB tables ----
    const tableProps = (partitionKeyName: string, sortKeyName?: string): dynamodb.TableProps => ({
      partitionKey: { name: partitionKeyName, type: dynamodb.AttributeType.STRING },
      sortKey: sortKeyName ? { name: sortKeyName, type: dynamodb.AttributeType.STRING } : undefined,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy,
      deletionProtection: isInt,
    });

    const flaggedBatches = new dynamodb.Table(this, 'FlaggedBatches', {
      ...tableProps('PK', 'SK'),
      tableName: `asli-${stage}-flagged-batches`,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });
    flaggedBatches.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });
    flaggedBatches.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
    });

    const ingestionState = new dynamodb.Table(this, 'IngestionState', {
      ...tableProps('PK', 'SK'),
      tableName: `asli-${stage}-ingestion-state`,
    });

    const cabinets = new dynamodb.Table(this, 'Cabinets', {
      ...tableProps('PK', 'SK'),
      tableName: `asli-${stage}-cabinets`,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });
    cabinets.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });
    cabinets.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
    });
    cabinets.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
    });

    const pushSubscriptions = new dynamodb.Table(this, 'PushSubscriptions', {
      ...tableProps('PK', 'SK'),
      tableName: `asli-${stage}-push-subscriptions`,
    });

    const reference = new dynamodb.Table(this, 'Reference', {
      ...tableProps('PK', 'SK'),
      tableName: `asli-${stage}-reference`,
    });
    reference.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
    });

    const stats = new dynamodb.Table(this, 'Stats', {
      ...tableProps('PK', 'SK'),
      tableName: `asli-${stage}-stats`,
    });

    const reports = new dynamodb.Table(this, 'Reports', {
      ...tableProps('PK', 'SK'),
      tableName: `asli-${stage}-reports`,
    });

    const idempotency = new dynamodb.Table(this, 'Idempotency', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy,
      deletionProtection: isInt,
      tableName: `asli-${stage}-idempotency`,
      timeToLiveAttribute: 'expiration',
    });

    const tables: Record<TableName, dynamodb.Table> = {
      'flagged-batches': flaggedBatches,
      'ingestion-state': ingestionState,
      cabinets,
      'push-subscriptions': pushSubscriptions,
      reference,
      stats,
      reports,
      idempotency,
    };
    for (const [name, table] of Object.entries(tables) as [TableName, dynamodb.Table][]) {
      new ssm.StringParameter(this, `TableNameParam-${name}`, {
        parameterName: ssmName(stage, SSM_PATHS.table(name)),
        stringValue: table.tableName,
      });
      if (table.tableStreamArn) {
        new ssm.StringParameter(this, `TableStreamParam-${name}`, {
          parameterName: ssmName(stage, SSM_PATHS.tableStream(name)),
          stringValue: table.tableStreamArn,
        });
      }
    }

    // ---- S3 buckets ----
    const bucketLifecycle: Partial<Record<BucketName, s3.LifecycleRule[]>> = {
      uploads: [{ expiration: Duration.days(1) }],
    };
    const buckets: Record<BucketName, s3.Bucket> = {
      raw: new s3.Bucket(this, 'RawBucket', {
        bucketName: `asli-${stage}-raw`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        versioned: true,
        removalPolicy,
        autoDeleteObjects: !isInt,
      }),
      uploads: new s3.Bucket(this, 'UploadsBucket', {
        bucketName: `asli-${stage}-uploads`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        lifecycleRules: bucketLifecycle.uploads,
        removalPolicy,
        autoDeleteObjects: !isInt,
      }),
      public: new s3.Bucket(this, 'PublicBucket', {
        bucketName: `asli-${stage}-public`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        removalPolicy,
        autoDeleteObjects: !isInt,
      }),
    };
    for (const [name, bucket] of Object.entries(buckets) as [BucketName, s3.Bucket][]) {
      new ssm.StringParameter(this, `BucketNameParam-${name}`, {
        parameterName: ssmName(stage, SSM_PATHS.bucket(name)),
        stringValue: bucket.bucketName,
      });
    }

    // ---- SNS topics ----
    const alertsTopic = new sns.Topic(this, 'AlertsTopic', { topicName: `asli-${stage}-alerts` });
    const opsTopic = new sns.Topic(this, 'OpsTopic', { topicName: `asli-${stage}-ops` });
    new ssm.StringParameter(this, 'AlertsTopicArnParam', {
      parameterName: ssmName(stage, SSM_PATHS.sns.alerts),
      stringValue: alertsTopic.topicArn,
    });
    new ssm.StringParameter(this, 'OpsTopicArnParam', {
      parameterName: ssmName(stage, SSM_PATHS.sns.ops),
      stringValue: opsTopic.topicArn,
    });

    // ---- DLQ for stream consumers (A2, F, G2) ----
    const dlq = new sqs.Queue(this, 'StreamDlq', {
      queueName: `asli-${stage}-stream-dlq`,
      retentionPeriod: Duration.days(14),
    });
    new ssm.StringParameter(this, 'DlqUrlParam', {
      parameterName: ssmName(stage, SSM_PATHS.dlq.url),
      stringValue: dlq.queueUrl,
    });
    new ssm.StringParameter(this, 'DlqArnParam', {
      parameterName: ssmName(stage, SSM_PATHS.dlq.arn),
      stringValue: dlq.queueArn,
    });

    // ---- Cognito ----
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `asli-${stage}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy,
    });
    const userPoolClient = userPool.addClient('WebClient', {
      authFlows: { userSrp: true },
      generateSecret: false,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
    });
    userPool.addGroup('AdminGroup', { groupName: 'admin', description: 'Demo replay + admin API access' });
    const userPoolDomain = userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: `asli-${stage}` },
    });

    new ssm.StringParameter(this, 'UserPoolIdParam', {
      parameterName: ssmName(stage, SSM_PATHS.cognito.userPoolId),
      stringValue: userPool.userPoolId,
    });
    new ssm.StringParameter(this, 'UserPoolClientIdParam', {
      parameterName: ssmName(stage, SSM_PATHS.cognito.userPoolClientId),
      stringValue: userPoolClient.userPoolClientId,
    });
    new ssm.StringParameter(this, 'UserPoolDomainParam', {
      parameterName: ssmName(stage, SSM_PATHS.cognito.userPoolDomain),
      stringValue: userPoolDomain.domainName,
    });

    // ---- HTTP API with JWT authorizer + CORS ----
    const amplifyOrigin = process.env.AMPLIFY_URL;
    const allowOrigins = ['http://localhost:5173', ...(amplifyOrigin ? [amplifyOrigin] : [])];

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: `asli-${stage}`,
      corsPreflight: {
        allowOrigins,
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
    // Built as an L1 resource (not the L2 HttpJwtAuthorizer) because the L2 only creates
    // its CfnAuthorizer lazily when a route binds it, and routes are added later by lane
    // stacks (via infra/lib/api-routes.ts), not here - we need a real authorizerId now to
    // export to SSM for those lane stacks to import.
    const jwtAuthorizer = new apigwv2.CfnAuthorizer(this, 'JwtAuthorizer', {
      apiId: httpApi.apiId,
      authorizerType: 'JWT',
      name: `asli-${stage}-jwt`,
      identitySource: ['$request.header.Authorization'],
      jwtConfiguration: {
        audience: [userPoolClient.userPoolClientId],
        issuer: userPool.userPoolProviderUrl,
      },
    });

    new ssm.StringParameter(this, 'HttpApiIdParam', {
      parameterName: ssmName(stage, SSM_PATHS.httpApi.id),
      stringValue: httpApi.apiId,
    });
    new ssm.StringParameter(this, 'HttpApiEndpointParam', {
      parameterName: ssmName(stage, SSM_PATHS.httpApi.endpoint),
      stringValue: httpApi.apiEndpoint,
    });
    new ssm.StringParameter(this, 'JwtAuthorizerIdParam', {
      parameterName: ssmName(stage, SSM_PATHS.httpApi.jwtAuthorizerId),
      stringValue: jwtAuthorizer.attrAuthorizerId,
    });

    // ---- Verified Permissions ----
    const policyStore = new avp.CfnPolicyStore(this, 'PolicyStore', {
      validationSettings: { mode: 'STRICT' },
      description: `Asli cabinet-sharing authz (${stage})`,
      schema: { cedarJson: JSON.stringify(AVP_SCHEMA) },
    });
    for (const [name, statement] of Object.entries(AVP_POLICIES)) {
      new avp.CfnPolicy(this, `Policy-${name}`, {
        policyStoreId: policyStore.attrPolicyStoreId,
        definition: { static: { description: `${name}.cedar`, statement } },
      });
    }
    new ssm.StringParameter(this, 'AvpPolicyStoreIdParam', {
      parameterName: ssmName(stage, SSM_PATHS.avp.policyStoreId),
      stringValue: policyStore.attrPolicyStoreId,
    });

    // ---- Bedrock vision model placeholder (T01 fills the real value in) ----
    new ssm.StringParameter(this, 'BedrockVisionModelIdParam', {
      parameterName: ssmName(stage, SSM_PATHS.bedrock.visionModelId),
      stringValue: process.env.BEDROCK_VISION_MODEL_ID ?? 'PLACEHOLDER_PENDING_T01',
    });
  }
}

/** docs/PERMISSIONS.md Cedar schema, in Verified Permissions' JSON schema representation. */
const AVP_SCHEMA = {
  Asli: {
    entityTypes: {
      User: { shape: { type: 'Record', attributes: {} } },
      MemberGroup: { shape: { type: 'Record', attributes: {} } },
      Cabinet: {
        shape: {
          type: 'Record',
          attributes: {
            owners: { type: 'Entity', name: 'MemberGroup' },
            editors: { type: 'Entity', name: 'MemberGroup' },
            viewers: { type: 'Entity', name: 'MemberGroup' },
          },
        },
      },
    },
    actions: {
      ViewCabinet: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
      AddMedicine: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
      RemoveMedicine: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
      ManageMembers: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
      ReceiveAlerts: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
    },
  },
};

/** docs/PERMISSIONS.md policies/*.cedar, mirrored here (packages/authz owns the canonical .cedar files). */
const AVP_POLICIES: Record<string, string> = {
  view: `permit (principal, action in [Asli::Action::"ViewCabinet", Asli::Action::"ReceiveAlerts"], resource)
when { principal in resource.owners || principal in resource.editors || principal in resource.viewers };`,
  edit: `permit (principal, action in [Asli::Action::"AddMedicine", Asli::Action::"RemoveMedicine"], resource)
when { principal in resource.owners || principal in resource.editors };`,
  manage: `permit (principal, action == Asli::Action::"ManageMembers", resource)
when { principal in resource.owners };`,
};
