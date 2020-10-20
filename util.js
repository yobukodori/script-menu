function truncate(str, maxCodeLength){
	return str.length > maxCodeLength ? 
		str.substring(0, maxCodeLength/2) + "... " + str.substring(str.length - maxCodeLength/2) 
		: str;
}

function isString(v){
	return typeof v === 'string' || (typeof v !== "undefined" && v instanceof String);
}

function scriptToString(s, maxCodeLength)
{
	if (s == null){
		return "(null)";
	}
	if (s.js == null){
		return "(not script)";
	}
	return "name: " + s.name + '\n'
			+ (s.matches ? "matches: [" + s.matches + "]\n" : "")
			+ (s.options ? "options: " + JSON.stringify(s.options) + "\n" : "")
			+ "js: " + (typeof maxCodeLength !== "undefined" ? truncate(s.js, maxCodeLength) : s.js);
}

function parseScriptsResource(scriptsResource)
{
	function what(s){
		if (typeof s === "undefined"){
			return { type: "directive", name: "name", eof: true };
		}
		else {
			let r = s.match(/^\/\/([a-z]\w+)(\s|$)/);
			if (r){ return {type: "directive", name: r[1], value: s.substring(r[1].length+2).trim()}; }
			else if (/^(\s*\/\/|\s*$)/.test(s)){ return { type: "empty" }; }
			else { return { type: "code" }; }
		}
	}
	function isDirective(line, name){
		return new RegExp("^//" + name + "(\\s.*)?$").test(line);
	}
	let res = {error: null, line: 0, scripts: []};
	if (! isString(scriptsResource)){
		res.error = "scriptsResource must be string: " + typeof scriptsResource;
		return res;
	}
	let rules = {
		initial: {
			followingDirectives: ["name"]
		},
		name: {
			required: true,
			has: "value",
			followingDirectives: ["matches", "options", "js"]
		},
		matches: {
			has: "value",
			type: "comma separated",
			defaultValue: [],
			followingDirectives: ["options", "js"]
		},
		options: {
			has: "code",
			type: "json",
			defaultValue: {},
			followingDirectives: ["matches", "js"]
		},
		js: {
			required: true,
			has: "code",
			followingDirectives: ["name"]
		}
	};
	Object.keys(rules).forEach(k=>{ rules[k].name = k; });
	let a = scriptsResource.split('\n'), script, rule = rules.initial;
	if (a.length > 0 && a[a.length - 1].length === 0){
		a.pop();
	}
	for (let i = 0 ; i <= a.length ; i++){
		res.line = i + 1;
		let s = a[i], w = what(s);
		if (w.type === "directive"){
			if (rule.has === "code"){
				script[rule.name] = script[rule.name].join('\n');
			}
			if (rule.type === "json"){
				let json = script[rule.name];
				if (json.trim().length > 0){
					try {
						script[rule.name] = JSON.parse(json);
					}
					catch (e){
						res.error = e.message;
						break;
					}
				}
				else {
					script[rule.name] = {};
				}
			}
			else if (rule.type === "comma separated"){
				script[rule.name] = script[rule.name].split(',').map(e=>e.trim()).filter(e=>e.length > 0);
			}
			if (w.name === "name" && script){
				Object.keys(rules).forEach(k=>{
					if (rules[k].required && typeof script[k] === "undefined"){
						res.error = "//" + k + " is required.";
					}
				});
				if (res.error){
					break;
				}
			}
			if (w.eof)
				break;
		}
		if (w.type === "directive"){
			if (rule.type === "json"){
				let json = script[rule.name];
			}
			if (! rule.followingDirectives.includes(w.name)){
				res.error = "unexpected directive //" + w.name;
				break;
			}
			rule = rules[w.name];
			if (w.name === "name"){
				script = {};
				res.scripts.push(script);
			}
			if (typeof script[rule.name] !== "undefined"){
				res.error = "//" + rule.name + " has been defined multiple times."
				break;
			}
			if (rule.has === "value"){
				if (! w.value){
					res.error = "//" + rule.name + " requires argment";
					break;
				}
				script[rule.name] = w.value;
			}
			else if (rule.has === "code"){
				script[rule.name] = [];
			}
		}
		else if (w.type === "empty"){
			if (rule.has === "code" && rule.type !== "json"){
				script[rule.name].push(s);
			}
		}
		else if (w.type === "code"){
			if (rule.has !== "code"){
				res.error = "unexpected code line.";
				break;
			}
			script[rule.name].push(s);
		}
		else {
			res.error = "unknown line type " + w.type;
			break;
		}
	}
	return res;
}

