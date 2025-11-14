use axum::{
    routing::get,
    Router,
    Json,
};
use serde::Serialize;

// This is like a TypeScript interface
#[derive(Serialize)]
struct HealthResponse {
    status: String,
    message: String,
}

// This is our handler function (like an Express route handler)
async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        message: "JARVIS backend is running!".to_string(),
    })
}

async fn root() -> &'static str {
    "Welcome to JARVIS! 🤖"
}

#[tokio::main]
async fn main() {
    // Create router (like Express app)
    let app = Router::new()
        .route("/", get(root))  
        .route("/health", get(health_check));

    // Start server on port 8000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000")
        .await
        .unwrap();
    
    println!("🚀 JARVIS backend running on http://localhost:8000");
    
    axum::serve(listener, app)
        .await
        .unwrap();
}