var getVKCharMap = {
	VK_SPACE:               " ", //32
	VK_COLON:               ":", //58
	VK_SEMICOLON:           ";", //59
	VK_LESS_THAN:           "<", //60
	VK_EQUALS:              "=", //61
	VK_GREATER_THAN:        ">", //62
	VK_QUESTION_MARK:       "?", //63
	VK_AT:                  "@", //64
	VK_MULTIPLY:            "*", //106
	VK_ADD:                 "+", //107
	VK_SUBTRACT:            "-", //109
	VK_DECIMAL:             ".", //110
	VK_DIVIDE:              "/", //111
	VK_CIRCUMFLEX:          "^", //160
	VK_EXCLAMATION:         "!", //161
	VK_DOUBLE_QUOTE:        '"', //162
	VK_HASH:                "#", //163
	VK_DOLLAR:              "$", //164
	VK_PERCENT:             "%", //165
	VK_AMPERSAND:           "&", //166
	VK_UNDERSCORE:          "_", //167
	VK_OPEN_PAREN:          "(", //168
	VK_CLOSE_PAREN:         ")", //169
	VK_ASTERISK:            "*", //170
	VK_PLUS:                "+", //171
	VK_PIPE:                "|", //172
	VK_HYPHEN_MINUS:        "-", //173
	VK_OPEN_CURLY_BRACKET:  "{", //174
	VK_CLOSE_CURLY_BRACKET: "}", //175
	VK_TILDE:               "~", //176
	VK_COMMA:               ",", //188
	VK_PERIOD:              ".", //190
	VK_SLASH:               "/", //191
	VK_BACK_QUOTE:          "`", //192
	VK_OPEN_BRACKET:        "[", //219
	VK_BACK_SLASH:          "\\", //220
	VK_CLOSE_BRACKET:       "]", //221
	VK_QUOTE:               "'", //222
	__proto__: null
};
function getVKChar(vk) {
	// Firefox doesn't have string representation for some codes...
	// https://developer.mozilla.org/en-US/docs/DOM/KeyboardEvent#Virtual_key_codes
	return getVKCharMap[vk]
		|| /^VK_(?:NUMPAD)?([\d+A-Z])$/.test(vk) && RegExp.$1
		|| undefined;
}