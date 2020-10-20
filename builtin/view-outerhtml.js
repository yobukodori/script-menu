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
	a.setAttribute("style","position: fixed; top:0; right:0; padding: 0.5em 1em; background-color: lightgray; border: solid; font-size:24px;font-family:serif;");
	a.addEventListener("click", ev=>{
		a.remove();
	});
	document.body.appendChild(a);
})();
