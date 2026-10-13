import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { config } from './config';

export const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

const Bucket = config.s3.bucket;

export async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket }));
  }
}

export async function putObject(key: string, body: Buffer, contentType?: string) {
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key: string) {
  const res = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  return res.Body as Readable;
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
}
