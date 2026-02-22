use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    pub name: String,
    pub exe_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shortcut_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_base64: Option<String>,
    pub status: GameStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_type: Option<BlockType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_until: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blocked_at: Option<String>,
    /// Total duration in minutes for timed blocks
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_minutes: Option<i64>,
    /// Elapsed minutes counted by background timer ticks
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub elapsed_minutes: Option<i64>,
    /// Timestamp of the last timer tick (for detecting clock manipulation)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_tick_at: Option<String>,
    /// The original file name before rename (used for restore)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum GameStatus {
    Active,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum BlockType {
    Timed,
    Permanent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockOptions {
    pub game_id: String,
    pub block_type: BlockType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_minutes: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub auto_start: bool,
    pub minimize_to_tray: bool,
    pub vault_path: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_start: false,
            minimize_to_tray: true,
            vault_path: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MathChallenge {
    pub question: String,
    pub answer: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    pub games: Vec<Game>,
    pub settings: AppSettings,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            games: Vec::new(),
            settings: AppSettings::default(),
        }
    }
}
