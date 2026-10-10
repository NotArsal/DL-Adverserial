# Security and Observability

As a digital forensic tool, the system requires strict security boundaries and deep observability. During the final audit phase, several enterprise-grade hardening features were implemented.

## 1. Security Hardening

### OriginGuard (CORS & CSWSH Protection)
By default, WebSocket connections do not respect standard CORS headers, leaving them vulnerable to Cross-Site WebSocket Hijacking (CSWSH). To prevent this, the backend implements `OriginGuard`, a strict middleware that validates the `Origin` header on all incoming WebSocket upgrades and state-changing REST requests. Requests from unauthorized domains are immediately rejected with a 403 Forbidden status.

### Resource Exhaustion Prevention
- **WebSocket Frame Limits**: Memory bounds are placed on incoming WebSocket frames to prevent Denial of Service (DoS) attacks via oversized payloads.
- **Decompression Bomb Mitigation**: Image uploads enforce strict pixel-count caps (e.g., maximum 400x400 for analysis) to prevent memory exhaustion during decoding.
- **Upload Size Caps**: Hard limits are enforced on static uploads (10 MB for images, 200 MB for videos).

### Path Traversal Mitigation
In earlier versions, the video streaming endpoint accepted raw, client-provided file paths, which could lead to arbitrary file reads or deletions (`unlink`). The modern architecture replaces this with an opaque session ID mapping. All uploaded files are stored in a sandboxed, backend-managed directory, completely isolated from user input.

## 2. Observability (OpenTelemetry)

To ensure the system is diagnosable in production, both the frontend and backend are natively instrumented with **OpenTelemetry**.

### Distributed Tracing
W3C Trace Context headers (Baggage) propagate across CORS boundaries. This allows a single trace to track a user's click in the React frontend, the resulting `fetch` request over the network, and the corresponding inference time inside the Python backend.

### Backend Telemetry
FastAPI natively exports spans via `BatchSpanProcessor`. Every REST endpoint and WebSocket connection automatically logs span timings, making it trivial to identify bottlenecks in the neural network inference pipeline.

### Frontend Telemetry
The React application uses `@opentelemetry/auto-instrumentations-web` to trace page loads, user interactions, and XMLHttpRequests/fetch calls, ensuring that client-side latency is measured accurately.
