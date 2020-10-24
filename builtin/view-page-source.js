(function(){
	let a = document.createElement("a");
	let is_pc = ! navigator.userAgent.includes("Android"),
		position = is_pc ? " top:0; right:0;" : " top:50%; left:50%; transform: translate(-50%,-50%);";
	a.setAttribute("style", "position:fixed;" + position + " padding:0.5em 1em; font-size:large; background-color:#ffff88; border:solid; z-index:2147483647");
	a.addEventListener("click", ev=> a.remove());
	document.addEventListener("click", ev => a.remove());
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
