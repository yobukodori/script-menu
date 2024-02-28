var my = {
	os : "n/a", // mac|win|android|cros|linux|openbsd
	defaultTitle: "Script Menu",
	initialized: null,
	settings: {},
	debug: false,
	inPageMenu: false,
	scriptsResource: "",
	scripts: [],
	items: [],
	modules: {},
	cache: {},
	//====================================================
    init : function(platformInfo) 
	{
		my.initialized = new Promise((resolve, reject)=>{
			try {
				let man = browser.runtime.getManifest();
				if (man.browser_action && man.browser_action.default_title){
					my.defaultTitle = man.browser_action.default_title;
				}
				my.os = platformInfo.os;

				browser.runtime.onMessage.addListener(my.onMessage);
				
				browser.storage.local.get(["inPageMenu", "printDebugInfo", "addLineNumbers", "colorScheme", "scriptsResource"])
				.then((pref) => {
					my.updateSettings(pref);
					resolve();
				})
				.catch(err=>{
					reject(err);
				});
			}
			catch(e){
				reject(e.message);
			}
		});
    },
	//====================================================
	updateSettings : async function(pref)
	{
		my.settings = pref;
		let prevInPageMenu = my.inPageMenu;
		if ((my.inPageMenu = pref.inPageMenu || false) !== prevInPageMenu){
			if (my.inPageMenu){
				let filters = {url: [ {schemes: ["http", "https", "file"]} ]};
				browser.webNavigation.onDOMContentLoaded.addListener(this.onDOMContentLoaded, filters);
			}
			else {
				browser.webNavigation.onDOMContentLoaded.removeListener(this.onDOMContentLoaded);
			}
		}
		my.debug = pref.printDebugInfo || false;
		if (typeof pref.scriptsResource === "string"){
			if (pref.scriptsResource !== my.scriptsResource){
				my.cache = {};
				let res = await parseScriptsResourceAsync(pref.scriptsResource, my.get);
				if (res.error){
					my.scriptsResource = "";
					my.scripts = my.items = [];
					my.modules = {};
					let e = res.error;
					my.log("Error: " + e.message + " at " + e.source + ":" + (e.line > 0 ? e.line : "n/a"));
				}
				else {
					my.scriptsResource = pref.scriptsResource;
					my.scripts = res.scripts;
					my.items = res.items;
					my.modules = res.modules;
					my.items.forEach(s=>{
						if (s.matches){
							s.matchesRegExp = new RegExp(s.matches.map(pattern=>{
								return "(" + convertMatchPatternToRegExpLiteral(pattern) + ")";
							}).join("|"));
						}
						if (s.exclude){
							s.excludesRegExp = new RegExp(s.exclude.map(pattern=>{
								return "(" + convertMatchPatternToRegExpLiteral(pattern) + ")";
							}).join("|"));
						}
					});
				}
				my.log('Scripts changed');
				browser.tabs.query({url:["http://*/*", "https://*/*", "file://*/*"]})
				.then(tabs=>{
					tabs.forEach(tab=>{
						if (my.debug){ my.log("tabs.sendMessage " + tab.id + ' ' + tab.url); }
						browser.tabs.sendMessage(tab.id, {type: "scriptsChanged", scripts: my.items})
						.then(res=>{ if (my.debug){ my.log("tabs.sendMessage "+tab.id+" success"); } })
						.catch(err=>{
							let msg = err.toString();
							if (msg !== "Error: Could not establish connection. Receiving end does not exist."){
								my.log("Error: " + err + " on tabs.sendMessage " + tab.id);
							}
						});
					});
				});
			}
		}
	},
	//====================================================
	log : function(str)
	{
		browser.runtime.sendMessage({type: "log", str: str}).catch(err=>{});
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
			if (my.initialized){
				my.initialized.then(()=>{
					sendResponse({
						inPageMenu: my.inPageMenu,
						printDebugInfo: my.debug,
						addLineNumbers: my.settings.addLineNumbers,
						colorScheme: my.settings.colorScheme,
						scriptsResource: my.scriptsResource
					});
				})
				.catch(err=>{
					sendResponse({
						error: err,
					});
				});
				return true;
			}
			else {
				sendResponse({
					error: "background.js has not been initialized yet.",
				});
			}
		}
		else if (message.type === "getMenuItemScripts"){
			sendResponse({
				scripts: my.items,
			});
		}
		else if (message.type === "updateSettings"){
			my.updateSettings(message.pref);
		}
		else if (message.type === "executeScript"){
			my.executeScript(message.itemIndex);
		}
		else if (message.type === "httpGet"){
			my.get(message.url)
			.then(text => sendResponse({ text }))
			.catch(err => sendResponse({ error: "" + err }));
			return true;
		}
	},
	//====================================================
	onDOMContentLoaded : function(details)
	{
		let execDetails = {file: "in-page-menu.js"};
		try {
			browser.tabs.executeScript(details.tabId, execDetails)
			.then(value=>{
				if (my.debug){ my.log("# in-page-menu.js executed successfully") }
			})
			.catch(err=>{
				my.log("Error (then-catch): " + err + " on in-page-menu.js");
			});
		}
		catch(err){
			my.log("Error (try-catch): " + err.message + " on in-page-menu.js");
		}
	},
	//====================================================
	get: function (url){
		if (url in my.cache){
			return Promise.resolve(my.cache[url]);
		}
		return new Promise((resolve, reject)=>{
			if (my.debug){my.log("# fetching " + url);}
			fetch(url)
			.then(res=>{
				return res.ok ? res.text() : Promise.reject(res.status + ' ' + res.statusText + " while fetching " + url);
			})
			.then(text=>{ resolve(my.cache[url] = text); })
			.catch(err=>{ reject(err); });
		});
	},
	//====================================================
	executeScript: async function (itemIndex){
		let s = my.items[itemIndex];
		if (my.debug){my.log("# executing [" + s.name + "]");}
		let options = s.options || {}, matches = s.matches || [];
		let details = Object.assign({}, options), showResultInTab;
		if (/^builtin:.+/.test(s.js.trim())){
			details.file = "builtin/" + s.js.trim().substring("builtin:".length) + ".js";
			if (my.debug){my.log("# using builtin script: " + details.file);}
			showResultInTab = true;
		}
		else {
			let code = "", url;
			if (s.require){
				for (let i = 0 ; i < s.require.length ; i++){
					let moduleName = s.require[i], url = moduleName;
					if (/^https?:/.test(url )){
						try {
							code += await my.get(url) + "\n";
						}
						catch(err){
							my.log("Error: " + err);
							return;
						}
					}
					else {
						code += my.modules[moduleName] + "\n";
					}
				}
			}
			if (/^https?:/.test(url = s.js.trim())){
				try {
					code += await my.get(url) + "\n";
				}
				catch(err){
					my.log("Error: " + err);
					return;
				}
			}
			else {
				code += s.js;
			}
			if (details.wrapCodeInScriptTag){
				if (my.debug){my.log("# wraping code in a script tag");}
				let stringifiedCode = JSON.stringify(code);
				code = '(function(){ '
					+ 'let e = document.createElement("script"); '
					+ 'e.append(' + stringifiedCode + '); ';
				if (details.nonce){
					code += 'e.nonce = (Array.from(document.scripts).find(e => e.nonce) || {}).nonce; ';
				}
				code += 'document.documentElement.appendChild(e); '
					+ 'e.remove(); '
					+ '})()';
			}
			details.code = code;
		}
		delete details.wrapCodeInScriptTag;
		delete details.nonce;
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
