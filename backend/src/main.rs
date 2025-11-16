use axum::{
    routing::{get,post},
    Router,
    Json,
};
use serde::{Serialize,Deserialize};
use sysinfo::System;

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

#[derive(Serialize)]
struct SystemMetrics {
    cpu_usage: f32,
    memory_total: u64,
    memory_used: u64,
    memory_available: u64,
    cpu_count: usize,
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

async fn get_metrics() -> Json<SystemMetrics> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let memory_total = sys.total_memory();
    let memory_used = sys.used_memory();
    let memory_available = sys.available_memory();
    let cpu_count = sys.cpus().len();
    
    Json(SystemMetrics {
        cpu_usage,
        memory_total,
        memory_used,
        memory_available,
        cpu_count,
    })
}

#[tokio::main]
async fn main() {
    // Create router (like Express app)
    let app = Router::new()
        .route("/", get(root))  
        .route("/health", get(health_check))
        .route("/api/echo", post(echo_handler))
        .route("/api/metrics", get(get_metrics));

    // Start server on port 8000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000")
        .await
        .unwrap();
    
    println!("🚀 JARVIS backend running on http://localhost:8000");
    
    axum::serve(listener, app)
        .await
        .unwrap();
}
