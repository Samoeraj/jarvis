use axum::{
    routing::{get,post},
    Router,
    Json,
};
use serde::{Serialize,Deserialize};

// This is like a TypeScript interface
#[derive(Serialize)]
struct HealthResponse {
    status: String,
    message: String,
}
#[derive(Deserialize)]
struct EchoRequest {
    message: String,
}
#[derive(Serialize)]
struct EchoResponse {
    echo: String,
    length: usize,
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

async fn echo_handler(Json(payload): Json<EchoRequest>) -> Json<EchoResponse> {
    let message_length = payload.message.len();
    
    Json(EchoResponse {
        echo: payload.message,
        length: message_length,
    })
}

#[tokio::main]
async fn main() {
    // Create router (like Express app)
    let app = Router::new()
        .route("/", get(root))  
        .route("/health", get(health_check))
        .route("/api/echo", post(echo_handler));

    // Start server on port 8000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000")
        .await
        .unwrap();
    
    println!("🚀 JARVIS backend running on http://localhost:8000");
    
    axum::serve(listener, app)
        .await
        .unwrap();
}
