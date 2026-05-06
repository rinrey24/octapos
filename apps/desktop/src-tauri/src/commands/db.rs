#[tauri::command]
pub async fn initialize_db() -> Result<String, String> {
    Ok("Database initialized".to_string())
}
