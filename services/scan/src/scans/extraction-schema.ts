import type { DocumentType } from '@smithy/types';
import { z } from 'zod';

/** docs/SCANNING.md "Extraction schema" - what Bedrock's record_medicines tool returns. */
export const ExtractionConfidenceSchema = z.object({
  batchNumber: z.number().min(0).max(1).optional(),
  manufacturer: z.number().min(0).max(1).optional(),
  productName: z.number().min(0).max(1).optional(),
  expDate: z.number().min(0).max(1).optional(),
});

export const StripExtractionSchema = z.object({
  isMedicinePack: z.boolean(),
  productName: z.string().nullable(),
  brandName: z.string().nullable(),
  batchNumber: z.string().nullable(),
  manufacturer: z.string().nullable(),
  mfgDate: z.string().nullable(),
  expDate: z.string().nullable(),
  strength: z.string().nullable(),
  dosageForm: z.string().nullable(),
  mrp: z.string().nullable(),
  confidence: ExtractionConfidenceSchema,
  notes: z.string().nullable(),
});
export type StripExtraction = z.infer<typeof StripExtractionSchema>;

export const BillLineExtractionSchema = z.object({
  productName: z.string().nullable(),
  batchNumber: z.string().nullable(),
  expDate: z.string().nullable(),
  manufacturer: z.string().nullable(),
  quantity: z.number().nullable(),
  mrp: z.string().nullable(),
  confidence: ExtractionConfidenceSchema,
});
export type BillLineExtraction = z.infer<typeof BillLineExtractionSchema>;

export const BillExtractionSchema = z.object({
  isPharmacyBill: z.boolean(),
  lines: z.array(BillLineExtractionSchema),
});
export type BillExtraction = z.infer<typeof BillExtractionSchema>;

/** Bedrock Converse tool `inputSchema.json` for the strip prompt. */
export const STRIP_TOOL_JSON_SCHEMA: DocumentType = {
  type: 'object',
  properties: {
    isMedicinePack: { type: 'boolean' },
    productName: { type: ['string', 'null'] },
    brandName: { type: ['string', 'null'] },
    batchNumber: { type: ['string', 'null'] },
    manufacturer: { type: ['string', 'null'] },
    mfgDate: { type: ['string', 'null'] },
    expDate: { type: ['string', 'null'] },
    strength: { type: ['string', 'null'] },
    dosageForm: { type: ['string', 'null'] },
    mrp: { type: ['string', 'null'] },
    confidence: {
      type: 'object',
      properties: {
        batchNumber: { type: 'number' },
        manufacturer: { type: 'number' },
        productName: { type: 'number' },
        expDate: { type: 'number' },
      },
    },
    notes: { type: ['string', 'null'] },
  },
  required: ['isMedicinePack', 'productName', 'batchNumber', 'manufacturer', 'expDate', 'confidence'],
};

/** Bedrock Converse tool `inputSchema.json` for the bill prompt. */
export const BILL_TOOL_JSON_SCHEMA: DocumentType = {
  type: 'object',
  properties: {
    isPharmacyBill: { type: 'boolean' },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productName: { type: ['string', 'null'] },
          batchNumber: { type: ['string', 'null'] },
          expDate: { type: ['string', 'null'] },
          manufacturer: { type: ['string', 'null'] },
          quantity: { type: ['number', 'null'] },
          mrp: { type: ['string', 'null'] },
          confidence: {
            type: 'object',
            properties: {
              batchNumber: { type: 'number' },
              manufacturer: { type: 'number' },
              productName: { type: 'number' },
              expDate: { type: 'number' },
            },
          },
        },
        required: ['productName', 'batchNumber'],
      },
    },
  },
  required: ['isPharmacyBill', 'lines'],
};
