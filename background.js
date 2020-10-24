var my = {
	os : "n/a", // mac|win|android|cros|linux|openbsd
	defaultTitle: "Script Menu",
	initialized: false,
	debug: false,
	scriptsResource: "",
	scripts: [],
	errors: [],
	//====================================================
    error : function(msg, where) {
		my.errors.push({message: msg, where: where});
	},
	//====================================================
    init : function(platformInfo) 
	{
		let man = browser.runtime.getManifest();
		if (man.browser_action && man.browser_action.default_title){
			my.defaultTitle = man.browser_action.default_title;
		}
		my.os = platformInfo.os;

        browser.storage.local.get(["printDebugInfo", "scriptsResource"])
        .then((pref) => {
			my.updateSettings(pref);
			my.initialized = true;
        })
		.catch(err => my.error(err, "storage.local.get"));

		browser.runtime.onMessage.addListener(my.onMessage);
    },
	//====================================================
	updateSettings : function(pref)
	{
		my.debug = pref.printDebugInfo || false;
		if (typeof pref.scriptsResource === "string"){
			if (pref.scriptsResource !== my.scriptsResource){
				let res = parseScriptsResource(pref.scriptsResource);
				if (res.error){
					my.scriptsResource = "";
					my.scripts = [];
					my.log("error" + (res.line > 0 ? " line " + res.line : "") + ": " + res.error);
				}
				else {
					my.scriptsResource = pref.scriptsResource;
					my.scripts = res.scripts;
					my.scripts.forEach(s=>{
						if (s.matches){
							s.matchesRegExp = new RegExp(s.matches.map(pattern=>{
								return "(" + convertMatchPatternToRegExpLiteral(pattern) + ")";
							}).join("|"));
						}
						if (s.excludes){
							s.excludesRegExp = new RegExp(s.excludes.map(pattern=>{
								return "(" + convertMatchPatternToRegExpLiteral(pattern) + ")";
							}).join("|"));
						}
					});
				}
				my.log('Scripts changed');
			}
		}
	},
	//====================================================
	log : function(str)
	{
		browser.runtime.sendMessage({type: "log", str: str});
	},
	//====================================================
	onMessage : function(message, sender, sendResponse)
	{
		if (message.type === "getStatus"){
			sendResponse({
				debug: my.debug,
				scriptsResource: my.scriptsResource,
				scripts: my.scripts
			});
		}
		else if (message.type === "getSettings"){
			sendResponse({
				initialized: my.initialized,
				printDebugInfo: my.debug,
				scriptsResource: my.scriptsResource
			});
		}
		else if (message.type === "getScripts"){
			sendResponse({
				scripts: my.scripts
			});
		}
		else if (message.type === "getError"){
			sendResponse({
				error: my.errors
			});
		}
		else if (message.type === "updateSettings"){
			my.updateSettings(message.pref);
		}
		else if (message.type === "executeScript"){
			my.executeScript(message.itemIndex);
		}
	},
	executeScript: function (scriptIndex){
		let s = my.scripts[scriptIndex];
		if (my.debug){my.log("# executing [" + s.name + "]");}
		let code = s.js, options = s.options || {}, matches = s.matches || [];
		let details = Object.assign({}, options), showResultInTab;
		if (/^builtin:.+/.test(code.trim())){
			details.file = "builtin/" + code.trim().substring("builtin:".length) + ".js";
			if (my.debug){my.log("# using builtin script: " + details.file);}
			showResultInTab = true;
		}
		else {
			if (typeof details.wrapCodeInScriptTag !== "undefined"){
				if (details.wrapCodeInScriptTag){
					if (my.debug){my.log("# wraping code in a script tag");}
					let name = "_" + Math.random().toString().substring(2,10);
					code = '(function(){'
					+ 'let ' + name + ' = document.createElement("script");'
					+ '' + name + '.appendChild(document.createTextNode(' + JSON.stringify(code) + '));'
					+ 'document.documentElement.appendChild(' + name + '); ' + name + '.remove();'
					+ '})()';
				}
				if (my.debug){my.log("# deleting details.wrapCodeInScriptTag");}
				delete details.wrapCodeInScriptTag;
			}
			details.code = code;
		}
		try {
			browser.tabs.executeScript(details)
			.then(value=>{
				if (my.debug){ my.log("# executed successfully") }
			})
			.catch(err=>{
				my.log("Error (then-catch): " + err);
			});
		}
		catch(err){
			my.log("Error (try-catch): " + err.message);
		}
	}
};

browser.runtime.getPlatformInfo().then(my.init);
