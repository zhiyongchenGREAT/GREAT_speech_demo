function generate() {
	this.setAttribute("disabled", "");
	document.getElementById("generating").classList.add("show");
	let text = document.querySelector("#tacotron_text").value;
	console.log(text);
	let httpRequest = new XMLHttpRequest();
	httpRequest.responseType = "blob";
	httpRequest.onload = function () {
		document.getElementById("generating").classList.remove("show");
		$("#tacotron_modal").modal("show");
		let wav_file = httpRequest.response;
		let test_url = window.URL.createObjectURL(wav_file);
		let audio = document.getElementById("test");
		audio.src = test_url;				
		document.getElementById("start_tacotron").removeAttribute("disabled");
	};
	httpRequest.open("POST", "http://localhost:8100/taco_generate", true);
	let tacotron_push = {
		"data": text
	};
	tacotron_push = JSON.stringify(tacotron_push);
	httpRequest.send(tacotron_push);
}


/*application section*/
window.onload = function () {};

document.getElementById("start_tacotron").addEventListener("click", generate);