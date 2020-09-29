let audioContext = null;
let audioInput = null,
	gainNode = null,
	audioRecorder = null;
let canvas_enroll = document.querySelector("#visualizer_enroll");
let canvas_verification = document.querySelector("#visualizer_verification");

let canvasCtx_enroll = canvas_enroll.getContext("2d");
let canvasCtx_verification = canvas_verification.getContext("2d");
let counterBack;
let database_ID = {};
let enroll_dict = {
	"data": []
};

let sentencesConter = 0;
let sentences = ["1-3-4-6-7-4-2-3-4-8"];

function saveAudio(blob) {
	let userName, userID;
	if (document.querySelector("#userName").value === "") {
		userName = document.querySelector("#userName").placeholder;
	} else {
		userName = document.querySelector("#userName").value;
	}
	if (document.querySelector("#userID").value === "") {
		userID = document.querySelector("#userID").placeholder;
	} else {
		userID = document.querySelector("#userID").value;
	}
	let httpRequest = new XMLHttpRequest();
	httpRequest.onload = function () {
		let json = JSON.parse(httpRequest.responseText);
		console.log(json);
		$("#upload_modal").modal("show");
	};
	httpRequest.open("POST", location.protocol + "//" + document.domain + ":" + location.port + '/uploads', true);
	let formData = new FormData();
	formData.append("stage", "enrollment");
	formData.append("user_name", userName);
	formData.append("user_id", userID);
	formData.append("audio", blob);
	httpRequest.send(formData);
}


function gotStream(stream) {
	audioContext = new AudioContext();

	visualize(stream);

	audioInput = audioContext.createMediaStreamSource(stream); // Audio Input Node
	gainNode = audioContext.createGain(); // Gain Node to amplify audio stream
	audioInput.connect(gainNode);


	audioRecorder = new Recorder(gainNode); // Create Recorder object that receives audio data via Gain Node

}

function setupAudio() {
	navigator.mediaDevices.getUserMedia({
		audio: true,
		video: false
	})
		.then(gotStream)
		.catch(function (err) {
			alert("Error: Audio source for recording not found.");
			console.log(err);
		});
}

function startRecording() {
	this.setAttribute("disabled", "");
	document.getElementById("stopRecording").removeAttribute("disabled");
	document.getElementById("uploading").removeAttribute("disabled");
	document.getElementById("time_counter").classList.remove("bg-success");
	document.getElementById("time_counter").classList.add("progress-bar-animated");
	audioRecorder.clear();
	audioRecorder.record();

	let i = 0;

	counterBack = setInterval(function () {
		i++;
		if (i <= 100) {
			$("#time_counter").css("width", i + "%");
		} else {
			document.getElementById("time_counter").classList.add("bg-success");
			audioRecorder.stop();
			clearInterval(counterBack);
		}

	}, 250);
}

function stopRecording() {
	this.setAttribute("disabled", "");
	document.getElementById("startRecording").removeAttribute("disabled");
	document.getElementById("uploading").setAttribute("disabled", "");
	document.getElementById("time_counter").classList.remove("progress-bar-animated");
	document.getElementById("time_counter").classList.add("bg-success");
	clearInterval(counterBack);
	audioRecorder.stop();
	audioRecorder.clear();
}

function uploading() {
	this.setAttribute("disabled", "");
	document.getElementById("startRecording").removeAttribute("disabled");
	document.getElementById("stopRecording").setAttribute("disabled", "");
	document.getElementById("time_counter").classList.remove("progress-bar-animated");
	document.getElementById("time_counter").classList.add("bg-success");
	clearInterval(counterBack);
	audioRecorder.stop();
	audioRecorder.exportWAV(saveAudio);
}

function visualize(stream) {
	let source = audioContext.createMediaStreamSource(stream);

	let analyser = audioContext.createAnalyser();
	analyser.fftSize = 2048;
	let bufferLength = analyser.frequencyBinCount;
	let dataArray = new Uint8Array(bufferLength);

	source.connect(analyser);
	//analyser.connect(audioCtx.destination);

	draw_enroll();
	draw_verification();

	function draw_enroll() {
		let WIDTH = canvas_enroll.width;
		let HEIGHT = canvas_enroll.height;

		requestAnimationFrame(draw_enroll);

		analyser.getByteTimeDomainData(dataArray);

		canvasCtx_enroll.fillStyle = "rgb(69, 137, 148)";
		canvasCtx_enroll.fillRect(0, 0, WIDTH, HEIGHT);

		canvasCtx_enroll.lineWidth = 2;
		canvasCtx_enroll.strokeStyle = "rgb(255, 255, 255)";

		canvasCtx_enroll.beginPath();

		let sliceWidth = WIDTH * 1.0 / bufferLength;
		let x = 0;


		for (let i = 0; i < bufferLength; i++) {

			let v = dataArray[i] / 128.0;
			let y = v * HEIGHT / 2;

			if (i === 0) {
				canvasCtx_enroll.moveTo(x, y);
			} else {
				canvasCtx_enroll.lineTo(x, y);
			}

			x += sliceWidth;
		}

		canvasCtx_enroll.lineTo(canvas_enroll.width, canvas_enroll.height / 2);
		canvasCtx_enroll.stroke();

	}

	function draw_verification() {
		let WIDTH = canvas_verification.width;
		let HEIGHT = canvas_verification.height;

		requestAnimationFrame(draw_verification);

		analyser.getByteTimeDomainData(dataArray);

		canvasCtx_verification.fillStyle = "rgb(137, 175, 155)";
		canvasCtx_verification.fillRect(0, 0, WIDTH, HEIGHT);

		canvasCtx_verification.lineWidth = 2;
		canvasCtx_verification.strokeStyle = "rgb(255, 255, 255)";

		canvasCtx_verification.beginPath();

		let sliceWidth = WIDTH * 1.0 / bufferLength;
		let x = 0;


		for (let i = 0; i < bufferLength; i++) {

			let v = dataArray[i] / 128.0;
			let y = v * HEIGHT / 2;

			if (i === 0) {
				canvasCtx_verification.moveTo(x, y);
			} else {
				canvasCtx_verification.lineTo(x, y);
			}

			x += sliceWidth;
		}

		canvasCtx_verification.lineTo(canvas_verification.width, canvas_verification.height / 2);
		canvasCtx_verification.stroke();

	}
}

function setupIcon() {
	const colors = ["ECDB54", "E94B3C", "6F9FD8", "944743", "DBB1CD", "EC9787", "00A591", "6B5B95", "6C4F3D", "EADEDB", "BC70A4", "BFD641"];
	const icon = document.getElementsByClassName("icon");
	let i;
	for (i = 0; i < icon.length; i++) {
		const icon_color = colors[i % 12];
		const data_src = "holder.js/32x32?theme=thumb&bg=" + icon_color + "&fg=" + icon_color + "&size=1";
		icon[i].setAttribute("data-src", data_src);
		let userID = icon[i].parentNode.querySelector(".data-id").innerText;
		let userName = icon[i].parentNode.querySelector(".data-user").innerText;
		let userTracks = icon[i].parentNode.querySelector(".data-tracks").innerText;
		database_ID[userID] = {
			color: colors[i % 12],
			name: userName,
			tracks: userTracks
		};
	}
	console.log(database_ID);
}

function addToEnroll() {
	this.setAttribute("disabled", "");
	enroll_dict.data.push(this.id);
	console.log(enroll_dict);
	let enrolled_users = document.getElementsByClassName("enrolled-users");
	let i;
	let entries =
		"<div class=\"col-6 mb-2\">\n" +
		"<div class=\"d-flex align-items-center justify-content-between p-2 rounded shadow\" style=\"background-color:#" + database_ID[this.id].color + "\">\n" +
		"<div>\n" +
		"<h6 class=\"mb-0 text-white\">" + database_ID[this.id].name + "</h6>\n" +
		"<small class=\"text-white-50\">" + this.id + "</small>\n" +
		"</div>\n" +
		"<p class=\"m-0 text-white h3\">x" + database_ID[this.id].tracks[0] + "</p>\n" +
		"</div>\n" +
		"</div>";
	for (i = 0; i < enrolled_users.length; i++) {
		enrolled_users[i].innerHTML += entries;
	}
}

function enroll_all() {
	let httpRequest = new XMLHttpRequest();
	httpRequest.onload = function () {
		let json = JSON.parse(httpRequest.responseText);
		console.log(json);
		if (json.data === "all_good") {
			$("#enroll_modal").modal("show");
			document.getElementById("verifyCard").classList.remove("disabled");
		}
	};

	httpRequest.open("POST", location.protocol + "//" + document.domain + ":" + location.port + '/enroll', true);

	let data = JSON.stringify(enroll_dict);
	httpRequest.send(data);
}

function get_verify(blob) {
	let httpRequest = new XMLHttpRequest();
	httpRequest.onload = function () {
		let result = JSON.parse(httpRequest.responseText);
		console.log(result)

		document.getElementById("ASVinfo").innerText = "Speaker Detection";
		document.getElementById("ASVinfo").innerText += "\n"+result.data;

		document.getElementById("ASRinfo").innerText = "Speech Detection";
		document.getElementById("ASRinfo").innerText += "\n"+result.data_asr;

		for (var key in result) {
			var item = result[key];	
			if (key === "data") {
				// document.getElementById("ASVinfo").innerText += "\n"+item;
				continue
			}
			
			if (key === "data_asr") {
				// document.getElementById("ASRinfo").innerText += "\n"+item;
				continue
			}

			if (key === "data_asr_confi") {
				document.getElementById("ASRinfo").innerText += "\n"+"score:"+item;
				continue
			}

			document.getElementById("ASVinfo").innerText += "\n"+key+":"+item;
		}


		if (result.data === "Match" && result.data_asr === "Match") {
			let lock = document.getElementById("lock");
			lock.classList.add("panel_unlocked");			
			// lock.querySelector(".fa").classList.remove("fa-lock");
			// lock.querySelector(".fa").classList.add("fa-unlock");
		} else {
			let lock = document.getElementById("lock");
			lock.classList.add("panel_still_locked");
		}
		document.getElementById("verify").removeAttribute("disabled");
		document.getElementById("verify").innerText = "Verify";
	};
	httpRequest.open("POST", location.protocol + "//" + document.domain + ":" + location.port + '/verify', true);

	let formData = new FormData();
	formData.append("audio", blob);
	httpRequest.send(formData);
}

function verify() {
	this.setAttribute("disabled", "");
	this.innerText = "Listening";
	let lock = document.getElementById("lock");
	lock.classList.remove("panel_unlocked");
	lock.classList.remove("panel_still_locked");
	// console.log(lock.classList)
	// lock.querySelector(".fa").classList.remove("fa-unlock");
	// lock.querySelector(".fa").classList.add("fa-lock");

	audioRecorder.clear();
	audioRecorder.record();
	counterBack = setInterval(function () {
		audioRecorder.stop();
		audioRecorder.exportWAV(get_verify);
		audioRecorder.clear();
		clearInterval(counterBack);
		// document.getElementById("verify").removeAttribute("disabled");
		document.getElementById("verify").innerText = "Verifing...";
	}, 5000);
}

function open_mic() {
	this.setAttribute("disabled", "");
	document.getElementById("startRecording").removeAttribute("disabled");
	document.getElementById("verify").removeAttribute("disabled");
	let child = document.getElementById("noInput");
	child.parentNode.removeChild(child);
	document.getElementById("visualizer_enroll").classList.add("show");
	let child_verify = document.getElementById("noInputVerify");
	child_verify.parentNode.removeChild(child_verify);
	document.getElementById("visualizer_verification").classList.add("show");
	setupAudio();
}

function changeSentences() {
	sentencesConter++;
	document.getElementById("sentences").innerText = sentences[sentencesConter % sentences.length];
}

/*application section*/
// window.addEventListener('load', setupAudio);
window.onload = function () {
	// setupAudio();
};

document.onreadystatechange = function () {
	if (document.readyState === "interactive") {
		setupIcon();
	}
};

document.getElementById("openMic").addEventListener("click", open_mic);

document.getElementById("startRecording").addEventListener("click", startRecording);
document.getElementById("stopRecording").addEventListener("click", stopRecording);
document.getElementById("uploading").addEventListener("click", uploading);

document.getElementById("enroll-data").addEventListener("click", enroll_all);

let database_enroll = document.getElementsByClassName("add-enroll");
let i;
for (i = 0; i < database_enroll.length; i++) {
	database_enroll[i].addEventListener("click", addToEnroll);
}

document.getElementById("verify").addEventListener("click", verify);
document.getElementById("changeSentences").addEventListener("click", changeSentences);