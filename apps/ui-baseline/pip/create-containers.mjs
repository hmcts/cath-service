// Creates the blob containers pip expects (per pip-dev-env's README) in the parity Azurite
import { BlobServiceClient } from "@azure/storage-blob";

const CONNECTION_STRING =
  "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:20000/devstoreaccount1;";
const CONTAINERS = ["files", "artefact", "publications"];

const client = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
for (const name of CONTAINERS) {
  const { succeeded } = await client.getContainerClient(name).createIfNotExists();
  console.log(`${name}: ${succeeded ? "created" : "exists"}`);
}
