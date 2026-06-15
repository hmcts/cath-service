export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface S3UploadResult {
  success: boolean;
  s3Key: string;
  bucketName: string;
}

export interface PddaHtmlUploadResponse {
  success: boolean;
  message: string;
  s3_key?: string;
  correlation_id?: string;
}
