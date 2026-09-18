import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenApiGeneratorV3, OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { stringify } from 'yaml';
import { z } from 'zod';

extendZodWithOpenApi(z);

const api = await import('../src/api');

const __dirname = dirname(fileURLToPath(import.meta.url));

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT (Cognito idToken)',
});

// ---- Schemas ----
const ApiError = registry.register('ApiError', api.ApiErrorSchema);
const MedicineIdentity = registry.register('MedicineIdentity', api.MedicineIdentitySchema);
const AlertSummary = registry.register('AlertSummary', api.AlertSummarySchema);
const CheckItemResult = registry.register('CheckItemResult', api.CheckItemResultSchema);
const CreateUploadRequest = registry.register('CreateUploadRequest', api.CreateUploadRequestSchema);
const CreateUploadResponse = registry.register('CreateUploadResponse', api.CreateUploadResponseSchema);
const ScanRequest = registry.register('ScanRequest', api.ScanRequestSchema);
const ScanResponse = registry.register('ScanResponse', api.ScanResponseSchema);
const CheckRequest = registry.register('CheckRequest', api.CheckRequestSchema);
const CheckResponse = registry.register('CheckResponse', api.CheckResponseSchema);
const AlertDetail = registry.register('AlertDetail', api.AlertDetailSchema);
const CabinetList = registry.register('CabinetList', api.CabinetListSchema);
const CreateCabinetRequest = registry.register('CreateCabinetRequest', api.CreateCabinetRequestSchema);
const Cabinet = registry.register('Cabinet', api.CabinetSchema);
const CabinetDetail = registry.register('CabinetDetail', api.CabinetDetailSchema);
const AddMedicineRequest = registry.register('AddMedicineRequest', api.AddMedicineRequestSchema);
const MedicineWithStatus = registry.register('MedicineWithStatus', api.MedicineWithStatusSchema);
const CreateInviteRequest = registry.register('CreateInviteRequest', api.CreateInviteRequestSchema);
const Invite = registry.register('Invite', api.InviteSchema);
const UpdateMemberRequest = registry.register('UpdateMemberRequest', api.UpdateMemberRequestSchema);
const Member = registry.register('Member', api.MemberSchema);
const PushSubscriptionRequest = registry.register('PushSubscriptionRequest', api.PushSubscriptionRequestSchema);
const VapidPublicKeyResponse = registry.register('VapidPublicKeyResponse', api.VapidPublicKeyResponseSchema);
const GuidanceTemplate = registry.register('GuidanceTemplate', api.GuidanceTemplateSchema);
const ProblemReportRequest = registry.register('ProblemReportRequest', api.ProblemReportRequestSchema);
const ProblemReportResponse = registry.register('ProblemReportResponse', api.ProblemReportResponseSchema);
const PublicStats = registry.register('PublicStats', api.PublicStatsSchema);
const InsightsResponse = registry.register('InsightsResponse', api.InsightsResponseSchema);
const MetricsSummary = registry.register('MetricsSummary', api.MetricsSummarySchema);
const PharmacyCheckRequest = registry.register('PharmacyCheckRequest', api.PharmacyCheckRequestSchema);
const PharmacyCheckResponse = registry.register('PharmacyCheckResponse', api.PharmacyCheckResponseSchema);
const DemoReplayRequest = registry.register('DemoReplayRequest', api.DemoReplayRequestSchema);
const DemoReplayResponse = registry.register('DemoReplayResponse', api.DemoReplayResponseSchema);

void MedicineIdentity;
void AlertSummary;
void CheckItemResult;

const jsonResponse = (description: string, schema: z.ZodTypeAny) => ({
  description,
  content: { 'application/json': { schema } },
});

const errorResponses = {
  400: jsonResponse('Bad request', ApiError),
  401: jsonResponse('Unauthorized', ApiError),
  403: jsonResponse('Forbidden', ApiError),
  404: jsonResponse('Not found', ApiError),
  429: jsonResponse('Rate limited', ApiError),
};

const cabinetIdParam = z.object({ cabinetId: z.string() });
const medIdParam = z.object({ cabinetId: z.string(), medId: z.string() });
const alertRefParam = z.object({ alertRef: z.string() });
const codeParam = z.object({ code: z.string() });
const userIdParam = z.object({ cabinetId: z.string(), userId: z.string() });
const alertRefKeyParam = z.object({ guidanceKey: z.string() });
const langQuery = z.object({ lang: z.enum(['en', 'hi', 'kn']).optional() });

registry.registerPath({
  method: 'post',
  path: '/v1/uploads',
  tags: ['uploads'],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: CreateUploadRequest } } } },
  responses: { 200: jsonResponse('Upload URL', CreateUploadResponse), ...errorResponses },
});

registry.registerPath({
  method: 'post',
  path: '/v1/scans',
  tags: ['scans'],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: ScanRequest } } } },
  responses: { 200: jsonResponse('Scan result', ScanResponse), ...errorResponses },
});

registry.registerPath({
  method: 'post',
  path: '/v1/checks',
  tags: ['checks'],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: CheckRequest } } } },
  responses: { 200: jsonResponse('Check results', CheckResponse), ...errorResponses },
});

registry.registerPath({
  method: 'get',
  path: '/v1/alerts/{alertRef}',
  tags: ['alerts'],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: alertRefParam },
  responses: { 200: jsonResponse('Alert detail', AlertDetail), ...errorResponses },
});

registry.registerPath({
  method: 'get',
  path: '/v1/cabinets',
  tags: ['cabinets'],
  security: [{ [bearerAuth.name]: [] }],
  responses: { 200: jsonResponse('Cabinet list', CabinetList), ...errorResponses },
});

registry.registerPath({
  method: 'post',
  path: '/v1/cabinets',
  tags: ['cabinets'],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: CreateCabinetRequest } } } },
  responses: { 200: jsonResponse('Created cabinet', Cabinet), ...errorResponses },
});

registry.registerPath({
  method: 'get',
  path: '/v1/cabinets/{cabinetId}',
  tags: ['cabinets'],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: cabinetIdParam },
  responses: { 200: jsonResponse('Cabinet detail', CabinetDetail), ...errorResponses },
});

registry.registerPath({
  method: 'post',
  path: '/v1/cabinets/{cabinetId}/medicines',
  tags: ['cabinets'],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: cabinetIdParam,
    body: { content: { 'application/json': { schema: AddMedicineRequest } } },
  },
  responses: { 200: jsonResponse('Added medicine', MedicineWithStatus), ...errorResponses },
});

registry.registerPath({
  method: 'delete',
  path: '/v1/cabinets/{cabinetId}/medicines/{medId}',
  tags: ['cabinets'],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: medIdParam },
  responses: { 204: { description: 'Removed' }, ...errorResponses },
});

registry.registerPath({
  method: 'post',
  path: '/v1/cabinets/{cabinetId}/invites',
  tags: ['members'],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: cabinetIdParam,
    body: { content: { 'application/json': { schema: CreateInviteRequest } } },
  },
  responses: { 200: jsonResponse('Invite', Invite), ...errorResponses },
});

registry.registerPath({
  method: 'post',
  path: '/v1/invites/{code}/accept',
  tags: ['members'],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: codeParam },
  responses: { 200: jsonResponse('Cabinet', Cabinet), ...errorResponses },
});

registry.registerPath({
  method: 'patch',
  path: '/v1/cabinets/{cabinetId}/members/{userId}',
  tags: ['members'],
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: userIdParam,
    body: { content: { 'application/json': { schema: UpdateMemberRequest } } },
  },
  responses: { 200: jsonResponse('Member', Member), ...errorResponses },
});

registry.registerPath({
  method: 'delete',
  path: '/v1/cabinets/{cabinetId}/members/{userId}',
  tags: ['members'],
  security: [{ [bearerAuth.name]: [] }],
  request: { params: userIdParam },
  responses: { 204: { description: 'Removed' }, ...errorResponses },
});

registry.registerPath({
  method: 'post',
  path: '/v1/push/subscriptions',
  tags: ['push'],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: PushSubscriptionRequest } } } },
  responses: { 201: { description: 'Subscribed' }, ...errorResponses },
});

registry.registerPath({
  method: 'delete',
  path: '/v1/push/subscriptions',
  tags: ['push'],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({ endpoint: z.string() }) } } } },
  responses: { 204: { description: 'Unsubscribed' }, ...errorResponses },
});

registry.registerPath({
  method: 'get',
  path: '/v1/push/vapid-public-key',
  tags: ['push'],
  responses: { 200: jsonResponse('VAPID public key', VapidPublicKeyResponse) },
});

registry.registerPath({
  method: 'post',
  path: '/v1/push/test',
  tags: ['push'],
  security: [{ [bearerAuth.name]: [] }],
  responses: { 202: { description: 'Test push queued' }, ...errorResponses },
});

registry.registerPath({
  method: 'get',
  path: '/v1/content/guidance/{guidanceKey}',
  tags: ['content'],
  request: { params: alertRefKeyParam, query: langQuery },
  responses: { 200: jsonResponse('Guidance template', GuidanceTemplate), ...errorResponses },
});

registry.registerPath({
  method: 'post',
  path: '/v1/reports',
  tags: ['reports'],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: ProblemReportRequest } } } },
  responses: { 200: jsonResponse('PvPI pointer', ProblemReportResponse), ...errorResponses },
});

registry.registerPath({
  method: 'get',
  path: '/v1/public/stats',
  tags: ['public'],
  responses: { 200: jsonResponse('Public stats', PublicStats) },
});

registry.registerPath({
  method: 'get',
  path: '/v1/public/insights',
  tags: ['public'],
  responses: { 200: jsonResponse('Insights', InsightsResponse) },
});

registry.registerPath({
  method: 'get',
  path: '/v1/public/metrics',
  tags: ['public'],
  responses: { 200: jsonResponse('Metrics summary', MetricsSummary) },
});

registry.registerPath({
  method: 'post',
  path: '/v1/pharmacy/checks',
  tags: ['pharmacy'],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: PharmacyCheckRequest } } } },
  responses: { 200: jsonResponse('Pharmacy check results', PharmacyCheckResponse), ...errorResponses },
});

registry.registerPath({
  method: 'post',
  path: '/v1/admin/demo/replay-month',
  tags: ['admin'],
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { 'application/json': { schema: DemoReplayRequest } } } },
  responses: { 200: jsonResponse('Started demo replay', DemoReplayResponse), ...errorResponses },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
  openapi: '3.0.3',
  info: {
    title: 'Asli API',
    version: '1',
    description: 'CDSCO NSQ/Spurious batch checker - see docs/API.md for the source of truth.',
  },
});

const outPath = join(__dirname, '..', 'openapi.yaml');
writeFileSync(outPath, stringify(document));
console.log(`Wrote ${outPath}`);
