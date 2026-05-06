mod db;
mod commands;

pub fn run() {
    let migrations = db::migrations::get_migrations();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:octapos.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![commands::db::initialize_db,])
        .run(tauri::generate_context!())
        .expect("error while running OctaPOS");
}
