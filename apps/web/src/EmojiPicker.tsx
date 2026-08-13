import { EMOJI_PRESETS } from './api';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

/** 睡眠主题表情选择器（打卡墙头像）。 */
export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <div className="emoji-picker">
      {EMOJI_PRESETS.map((e) => (
        <button
          key={e}
          type="button"
          className={`emoji-option ${e === value ? 'selected' : ''}`}
          onClick={() => onChange(e)}
          aria-label={`选择表情 ${e}`}
          aria-pressed={e === value}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
