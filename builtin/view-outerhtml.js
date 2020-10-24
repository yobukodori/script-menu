(function(){
	let html, selection = window.getSelection(), range;
	if (selection.rangeCount > 0 && ! (range = selection.getRangeAt(0)).collapsed){
		const ELEMENT_NODE = 1, TEXT_NODE = 3;
		let container = range.commonAncestorContainer;
		if (container.nodeType === TEXT_NODE){
			container = container.parentNode;
		}
		html = container.outerHTML;
	}
	else {
		html = document.documentElement.outerHTML;
	}
	let a = document.createElement("a");
	a.textContent = "View outerHTML";
	a.href = URL.createObjectURL(new Blob([html],{type:'text/plain; charset="utf-8"'}));
	a.target = "_blank";
	let is_pc = ! navigator.userAgent.includes("Android"),
		position = is_pc ? " top:0; right:0;" : " top:50%; left:50%; transform: translate(-50%,-50%);";
	a.setAttribute("style","position:fixed;" + position + " padding:0.5em 1em; font-size:large; background-color:#ffff88; border:solid; z-index:2147483647;");
	a.addEventListener("click", ev=> a.remove());
	document.addEventListener("click", ev => a.remove());
	document.body.appendChild(a);
})();
