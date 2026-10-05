// The CaTH Inbound Publication API serves POST /publication at the server root, so the
// cutover from pip-data-management is a base-URL change only. /v1/publication is kept
// until the gateway path question is settled.
export { POST } from "./v1/publication.js";
