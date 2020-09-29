let audioContext = null;
let audioInput = null,
	gainNode = null,
	audioRecorder = null;
let canvas_enroll = document.querySelector("#visualizer_enroll");

let canvasCtx_enroll = canvas_enroll.getContext("2d");
let counterBack;
let database_ID = {};
let enroll_dict = {
	"data": []
};
let socket = null;
const namespace = "/test";
let identifying = false;
let canvas_rgb = "rgb(69, 137, 148)";

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

function saveAudio(blob) {
	socket.emit("identify", {
		data: blob
	});
}

function socketConnect() {
	socket = null;
	console.log("ready to connect");
	socket = io.connect(location.protocol + "//" + document.domain + ":" + location.port + namespace, {
		"force new connection": true
	});
	socket.on("connect", function () {
		socket.emit("my_event", {
			data: "Client side checked!"
		});
	});

	socket.on("my_response", function (msg) {
		console.log(msg);
	});

	socket.on("identify_my_response", function (msg) {
		console.log(msg);
		let identifyID = msg.data;
		if (identifyID === "Not Detected") {
			let user_box = document.getElementById("identify_user_name");
			user_box.setAttribute("style", "background-color:#A9A9A9; transition: all 0.2s;");
			user_box.children[0].classList.remove("text-white");
			user_box.children[0].classList.add("text-white-50");
			user_box.children[0].innerText = identifyID;
			canvas_rgb = "#A9A9A9";

		} else {
			let user_box = document.getElementById("identify_user_name");
			user_box.setAttribute("style", "background-color:#" + database_ID[identifyID].color + "; transition: all 0.2s;");
			user_box.children[0].classList.remove("text-white-50");
			user_box.children[0].classList.add("text-white");
			user_box.children[0].innerText = database_ID[identifyID].name;
			canvas_rgb = "#" + database_ID[identifyID].color;

		}

	});

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

	function draw_enroll() {
		let WIDTH = canvas_enroll.width;
		let HEIGHT = canvas_enroll.height;

		requestAnimationFrame(draw_enroll);

		analyser.getByteTimeDomainData(dataArray);

		// canvasCtx_enroll.fillStyle = 'rgb(69, 137, 148)';
		canvasCtx_enroll.fillStyle = canvas_rgb;
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
		}
	};
	httpRequest.open("POST", location.protocol + "//" + document.domain + ":" + location.port + '/enroll', true);

	let data = JSON.stringify(enroll_dict);
	httpRequest.send(data);
}

function start_identify() {
	socket.emit("my_event", {
		data: "start_recording"
	});
	audioRecorder.clear();
	audioRecorder.record();
	counterBack = setInterval(function () {
		audioRecorder.stop();
		audioRecorder.exportWAV(saveAudio);
		audioRecorder.clear();
		audioRecorder.record();
	}, 2000);
}

function stop_identify() {
	clearInterval(counterBack);
	audioRecorder.stop();
	audioRecorder.clear();
	socket.emit("my_event", {
		data: "stop recording"
	});
}

function disconnect() {
	audioRecorder.stop();
	audioRecorder.clear();
	socket.emit("disconnect_request");
}

function identify_handler() {
	if (identifying === false) {
		identifying = true;
		let progress = document.getElementById("identify_indicator");
		progress.classList.add("progress-bar-animated");
		socketConnect();
		this.innerText = "Stop";
		this.classList.remove("btn-primary");
		this.classList.add("btn-danger");
		start_identify();
	} else {
		identifying = false;
		let progress = document.getElementById("identify_indicator");
		progress.classList.remove("progress-bar-animated");
		this.innerText = "Start";
		this.classList.remove("btn-danger");
		this.classList.add("btn-primary");
		stop_identify();
		disconnect();
	}
}

function open_mic() {
	this.setAttribute("disabled", "");
	document.getElementById("start_identify").removeAttribute("disabled");
	let child = document.getElementById("noInput");
	child.parentNode.removeChild(child);
	document.getElementById("visualizer_enroll").classList.add("show");
	setupAudio();
}

/*application section*/
// window.addEventListener('load', setupAudio);
window.onload = function () {
	// socketConnect();
	// setupAudio();
};

document.onreadystatechange = function () {
	if (document.readyState === "interactive") {
		setupIcon();
	}
};

document.getElementById("openMic").addEventListener("click", open_mic);

document.getElementById("enroll-data").addEventListener("click", enroll_all);

let database_enroll = document.getElementsByClassName("add-enroll");
let i;
for (i = 0; i < database_enroll.length; i++) {
	database_enroll[i].addEventListener("click", addToEnroll);
}

document.getElementById("start_identify").addEventListener("click", identify_handler);