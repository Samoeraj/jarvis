use axum::{
    Json, Router,
    extract::ws::{WebSocket, WebSocketUpgrade},
    response::Response,
    routing::{get, post},
};
use chrono::Utc;
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;
use sysinfo::System;
use tokio::time::sleep;
use tower_http::cors::{Any, CorsLayer};

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

#[derive(Deserialize)]
struct ChatRequest {
    message: String,
}

#[derive(Serialize)]
struct ChatResponse {
    response: String,
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

async fn websocket_handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    println!("🔌 WebSocket client connected");

    loop {
        // Collect metrics
        let mut sys = System::new_all();
        sys.refresh_all();

        let cpu_usage = sys.global_cpu_info().cpu_usage();
        let memory_total = sys.total_memory();
        let memory_used = sys.used_memory();
        let memory_available = sys.available_memory();
        let cpu_count = sys.cpus().len();

        let bytes_to_gb = |bytes: u64| bytes as f32 / 1_073_741_824.0;

        let metrics = SystemMetrics {
            memory_total_bytes: memory_total,
            memory_used_bytes: memory_used,
            memory_available_bytes: memory_available,
            memory_total_gb: bytes_to_gb(memory_total),
            memory_used_gb: bytes_to_gb(memory_used),
            memory_available_gb: bytes_to_gb(memory_available),
            memory_usage_percent: (memory_used as f32 / memory_total as f32) * 100.0,
            cpu_usage,
            cpu_count,
            timestamp: Utc::now().to_rfc3339(),
        };

        // Serialize to JSON
        let json = match serde_json::to_string(&metrics) {
            Ok(j) => j,
            Err(e) => {
                eprintln!("Failed to serialize metrics: {}", e);
                break;
            }
        };

        // Send to client
        if socket
            .send(axum::extract::ws::Message::Text(json))
            .await
            .is_err()
        {
            println!("❌ Client disconnected");
            break;
        }

        // Wait 2 seconds before next update
        sleep(Duration::from_secs(2)).await;
    }
}

async fn chat_handler(Json(payload): Json<ChatRequest>) -> Json<ChatResponse> {
    println!("📝 Received chat request: {}", payload.message);

    // Path to your model
    let model_path = PathBuf::from("./models/llama-3.2-1b-instruct-q4_k_m.gguf");

    println!("🔍 Loading model from: {:?}", model_path);

    if !model_path.exists() {
        eprintln!("❌ Model file not found at: {:?}", model_path);
        return Json(ChatResponse {
            response: "Error: Model file not found".to_string(),
            timestamp: Utc::now().to_rfc3339(),
        });
    }

    println!("🧠 Initializing llama backend...");

    // Initialize the backend
    let backend = LlamaBackend::init().expect("Failed to initialize llama backend");

    println!("📦 Loading model...");

    // Load model
    let model_params = LlamaModelParams::default();
    let model = LlamaModel::load_from_file(&backend, model_path, &model_params)
        .expect("Failed to load model");

    println!("✅ Model loaded!");

    // Create context
    let ctx_params = LlamaContextParams::default().with_n_ctx(std::num::NonZero::new(2048));

    let mut ctx = model
        .new_context(&backend, ctx_params)
        .expect("Failed to create context");

    // Format prompt (Llama 3.2 chat format)
    let prompt = format!(
        "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\
        You are JARVIS, a helpful AI assistant. Be concise and friendly.<|eot_id|>\n\
        <|start_header_id|>user<|end_header_id|>\n\
        {}<|eot_id|>\n\
        <|start_header_id|>assistant<|end_header_id|>\n",
        payload.message
    );

    println!("🔤 Tokenizing prompt...");

    // Tokenize
    let tokens = model
        .str_to_token(&prompt, AddBos::Always)
        .expect("Failed to tokenize");

    println!("✅ Got {} tokens", tokens.len());

    // Create batch and add all prompt tokens
    let mut batch = LlamaBatch::new(tokens.len(), 1);

    // Mark the last token for logits
    for (i, token) in tokens.iter().enumerate() {
        let is_last = i == tokens.len() - 1;
        batch
            .add(*token, i as i32, &[0], is_last)
            .expect("Failed to add token to batch");
    }

    println!("🔄 Processing prompt...");

    // Decode prompt
    ctx.decode(&mut batch).expect("Failed to decode prompt");

    println!("💬 Generating response...");

    // Generate response
    let mut response = String::new();
    let max_tokens = 100;
    let mut n_cur = tokens.len();

    for i in 0..max_tokens {
        let candidates = ctx.candidates();

        // Get the token with the highest logit (greedy sampling)
        let next_token = candidates
            .into_iter()
            .max_by(|a, b| {
                a.logit()
                    .partial_cmp(&b.logit())
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .expect("No candidates")
            .id();

        // Check for end token
        if model.is_eog_token(next_token) {
            println!("✅ Reached end of generation at token {}", i);
            break;
        }

        // Add to response
        use llama_cpp_2::model::Special;
        if let Ok(piece) = model.token_to_str(next_token, Special::Tokenize) {
            response.push_str(&piece);
        }

        // Prepare batch for next token
        batch.clear();
        batch
            .add(next_token, n_cur as i32, &[0], true)
            .expect("Failed to add token to batch");

        n_cur += 1;

        // Decode next token
        ctx.decode(&mut batch).expect("Failed to decode next token");
    }

    println!("✅ Generated response: {}", response);

    Json(ChatResponse {
        response: response.trim().to_string(),
        timestamp: Utc::now().to_rfc3339(),
    })
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Create router (like Express app)
    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health_check))
        .route("/api/echo", post(echo_handler))
        .route("/api/metrics", get(get_metrics))
        .route("/ws", get(websocket_handler))
        .route("/api/chat", post(chat_handler))
        .layer(cors);

    // Start server on port 8000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();

    println!("🚀 JARVIS backend running on http://localhost:8000");

    axum::serve(listener, app).await.unwrap();
}
