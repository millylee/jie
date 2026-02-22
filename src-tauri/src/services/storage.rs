use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::models::AppData;

pub struct Storage {
    data_path: PathBuf,
    pub data: Mutex<AppData>,
}

impl Storage {
    pub fn new(app_data_dir: PathBuf) -> Self {
        fs::create_dir_all(&app_data_dir).ok();
        let data_path = app_data_dir.join("data.json");
        let data = if data_path.exists() {
            match fs::read_to_string(&data_path) {
                Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
                Err(_) => AppData::default(),
            }
        } else {
            AppData::default()
        };

        Self {
            data_path,
            data: Mutex::new(data),
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        let json = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
        fs::write(&self.data_path, json).map_err(|e| e.to_string())?;
        Ok(())
    }
}
