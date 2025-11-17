use axum::{
    routing::{get,post},
    Router,
    Json,
};
use serde::{Serialize,Deserialize};
use sysinfo::System;
use chrono::Utc;

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
    // Raw values in bytes
    memory_total_bytes: u64,
    memory_used_bytes: u64,
    memory_available_bytes: u64,
    
    // Human-readable values in GB
    memory_total_gb: f32,
    memory_used_gb: f32,
    memory_available_gb: f32,
    
    // Percentage
    memory_usage_percent: f32,
    
    // CPU info
    cpu_usage: f32,
    cpu_count: usize,
    
    // Timestamp
    timestamp: String,
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
    
    // Convert bytes to GB (1 GB = 1,073,741,824 bytes)
    let bytes_to_gb = |bytes: u64| bytes as f32 / 1_073_741_824.0;
    
    let memory_total_gb = bytes_to_gb(memory_total);
    let memory_used_gb = bytes_to_gb(memory_used);
    let memory_available_gb = bytes_to_gb(memory_available);
    
    // Calculate percentage
    let memory_usage_percent = (memory_used as f32 / memory_total as f32) * 100.0;
    
    // Get current timestamp
    let timestamp = Utc::now().to_rfc3339();
    
    Json(SystemMetrics {
        memory_total_bytes: memory_total,
        memory_used_bytes: memory_used,
        memory_available_bytes: memory_available,
        memory_total_gb,
        memory_used_gb,
        memory_available_gb,
        memory_usage_percent,
        cpu_usage,
        cpu_count,
        timestamp,
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
