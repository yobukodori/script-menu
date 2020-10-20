let my = browser.extension.getBackgroundPage().my, activeTabs;

function onDOMContentLoaded()
{
	document.querySelectorAll("body, input, textarea, button").forEach(e=>{
		e.classList.add(my.os === "android" ? "mobile" : "pc");
	});
	let menu = document.querySelector('#menu');
	function showMessage(msg){
		let e = document.createElement("div");
		e.appendChild(document.createTextNode(msg));
		e.classList.add("message");
		menu.appendChild(e);
	}
	if (activeTabs.length > 0){
		let tab = activeTabs[0];
		if (/^(https?|file):/.test(tab.url)){
			if (my.scripts.length > 0){
				my.scripts.forEach((s,i)=>{
					let item = document.createElement("div");
					item.index = i;
					item.classList.add("item");
					item.textContent = s.name;
					item.addEventListener("click", ev=>{
						my.executeScript(item.index);
						setTimeout(window.close, 0);
					});
					menu.appendChild(item);
				});
			}
			else {
				showMessage("No registered script.");
			}
		}
		else {
			showMessage("Not support special tabs.");
		}
	}
	else {
		showMessage("No active tab");
	}
}

browser.tabs.query({active:true,currentWindow:true})
.then(tabs=>{
	activeTabs = tabs;
	if (my.debug){
		tabs.forEach((tab,i)=>{
			my.log("tabs["+i+"] " + JSON.stringify(tab));
		});
	}
	if (document.readyState === "loading"){
		document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
	}
	else {
		onDOMContentLoaded();
	}
});
