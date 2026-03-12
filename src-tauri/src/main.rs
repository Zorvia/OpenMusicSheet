#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod midi_bridge;

use tauri::Manager;

#[tauri::command]
fn parse_midi_file(path: String) -> Result<String, String> {
    midi_bridge::parse_midi(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_midi_file(path: String, data: String) -> Result<(), String> {
    midi_bridge::write_midi(&path, &data).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![parse_midi_file, write_midi_file])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
