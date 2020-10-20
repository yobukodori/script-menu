(function(){
	let a = document.createElement("a");
	a.setAttribute("style","position:fixed;top:0;right:0;padding:0.5em 1em;background-color:lightgray;border:solid;");
	a.addEventListener("click",ev=>{
		a.remove();
	});
	a.href = "javascript:void(0)";
	a.textContent = "Requesting html";
	document.body.appendChild(a);
	fetch(location.href)
	.then(res=>{
		return res.arrayBuffer();
	})
	.then(buf=>{
		html = new TextDecoder(document.characterSet).decode(buf);
		a.href = URL.createObjectURL(new Blob([html],{type:'text/plain; charset="utf-8"'}));
		a.textContent = "View page source";
		a.target = "_blank";
	})
	.catch(e=>{
		a.textContent = e.message+"\nTap this message to close";
	});
})();
