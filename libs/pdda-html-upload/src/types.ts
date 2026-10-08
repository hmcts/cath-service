export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface S3UploadResult {
  success: boolean;
  s3Key: string;
  bucketName: string;
}
