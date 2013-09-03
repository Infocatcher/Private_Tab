function getVKChar(vk) {
	// Firefox doesn't have string representation for some codes...
	// https://developer.mozilla.org/en-US/docs/DOM/KeyboardEvent#Virtual_key_codes
	if(/^VK_(?:NUMPAD)?([\d+A-Z])$/.test(vk))
		return RegExp.$1;
	switch(vk) {
		case "VK_SPACE":               return " "; //32
		case "VK_COLON":               return ":"; //58
		case "VK_SEMICOLON":           return ";"; //59
		case "VK_LESS_THAN":           return "<"; //60
		case "VK_EQUALS":              return "="; //61
		case "VK_GREATER_THAN":        return ">"; //62
		case "VK_QUESTION_MARK":       return "?"; //63
		case "VK_AT":                  return "@"; //64
		case "VK_MULTIPLY":            return "*"; //106
		case "VK_ADD":                 return "+"; //107
		case "VK_SUBTRACT":            return "-"; //109
		case "VK_DECIMAL":             return "."; //110
		case "VK_DIVIDE":              return "/"; //111
		case "VK_CIRCUMFLEX":          return "^"; //160
		case "VK_EXCLAMATION":         return "!"; //161
		case "VK_DOUBLE_QUOTE":        return '"'; //162
		case "VK_HASH":                return "#"; //163
		case "VK_DOLLAR":              return "$"; //164
		case "VK_PERCENT":             return "%"; //165
		case "VK_AMPERSAND":           return "&"; //166
		case "VK_UNDERSCORE":          return "_"; //167
		case "VK_OPEN_PAREN":          return "("; //168
		case "VK_CLOSE_PAREN":         return ")"; //169
		case "VK_ASTERISK":            return "*"; //170
		case "VK_PLUS":                return "+"; //171
		case "VK_PIPE":                return "|"; //172
		case "VK_HYPHEN_MINUS":        return "-"; //173
		case "VK_OPEN_CURLY_BRACKET":  return "{"; //174
		case "VK_CLOSE_CURLY_BRACKET": return "}"; //175
		case "VK_TILDE":               return "~"; //176
		case "VK_COMMA":               return ","; //188
		case "VK_PERIOD":              return "."; //190
		case "VK_SLASH":               return "/"; //191
		case "VK_BACK_QUOTE":          return "`"; //192
		case "VK_OPEN_BRACKET":        return "["; //219
		case "VK_BACK_SLASH":          return "\\"; //220
		case "VK_CLOSE_BRACKET":       return "]"; //221
		case "VK_QUOTE":               return "'"; //222
	}
	return undefined;
}