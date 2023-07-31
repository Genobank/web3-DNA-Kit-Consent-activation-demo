// Global variables
let wallet = ethers.Wallet.createRandom();
generatePhrase = wallet.mnemonic.phrase;
generatePrivatekey = wallet.privateKey;
generateAddress = wallet.address;

arrayPhrase = generatePhrase.split(" ");

arr1 = arrayPhrase;
arr2 = [];

var pageURL = $(location).attr("href");

var biosampleId = null;
var permiteeId = null;
var physicalId = null;
var biosampleSecret = null;

// todays date
var d = new Date();

var month = d.getMonth()+1;
var day = d.getDate();
var year = d.getFullYear();
var signatureDate = 
	year  + '-' +
  ((''+month).length<2 ? '0' : '') + month + '-' +
  ((''+day).length<2 ? '0' : '') + day ;

// grab url query data
emptyUrl = window.location.href.indexOf('?')
checklabID = function () {
	if (emptyUrl == -1) {
		$('#randomVisitor').modal('hide');
		$('#invalidError').modal('show');
	}  else {
		$('#randomVisitor').modal('hide');
		$('#invalidError').modal('hide');
		biosampleSecret = window.location.hash.substr(1);
		biosampleId = new URL(pageURL).searchParams.get("biosampleId");
		permiteeId = new URL(pageURL).searchParams.get("laboratoryId");
		physicalId = new URL(pageURL).searchParams.get("physicalId");

		
   
		$('.btn-gotoConsent').append(' <span class="xxs gbid">#' + biosampleId +'</span>');
	}
}


$(async function() {
	const labProfile = await getLaboratoryProfile();
	if (!labProfile.data) {
		console.error("Error:", laboratory);
		alert('Invalid laboratory');
		throw new Error('Invalid laboratoryId')
		return;
	}
	text = JSON.parse(labProfile.data.text);
	console.log(text);
	$(".lab-name").text(`${text.name}`)
})

/**
 * Retrieves laboratory identity object.
 */
async function getLaboratory() {
	const url = new URL(location.href);
	const laboratoryId = url.searchParams.get("laboratoryId");
	if (!laboratoryId) {
		throw new Error("Invalid laboratory");
	}
	return fetch(`${window.API_BASE}/permittees/${laboratoryId}`, {
		method: 'GET',
		headers: {
			"Content-type": "application/json; charset=UTF-8"
		},
	}).then((res) => {
		return res.json();
	}).catch((e) => {
		return { errors: [{message: e }]};
	});
}

async function getLaboratoryProfile() {
	const url = new URL(location.href);
	const laboratoryId = url.searchParams.get("laboratoryId");
	if (!laboratoryId) {
		throw new Error("Invalid laboratory");
	}
	return fetch(`${window.API_BASE}/profiles/${laboratoryId}`, {
		method: 'GET',
		headers: {
			"Content-type": "application/json; charset=UTF-8"
		},
	}).then((res) => {
		return res.json();
	}).catch((e) => {
		return { errors: [{message: e }]};
	});
}

/**
 * Gets public key based on address.
 * @param address Address for which we want a public key.
 */
async function getPublicKey(address) {
  return fetch(`${window.API_BASE}/public-key/${address}`, {
		method: 'GET',
		headers: {
			"Content-type": "application/json; charset=UTF-8"
		},
	}).then((res) => {
		return res.json();
	}).catch((e) => {
		return { errors: [{message: e }]};
	});
}

/**
 * Performs a POST request to the APP server which creates a new public key.
 * 
 * @param signature User signature.
 * @param signatureKind Signature kind.
 */
async function createPublicKey(signature, signatureKind) {
  return fetch(`${window.API_BASE}/public-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify({
      signature,
      signatureKind
    })
  }).then((res) => {
    return res.json();
  }).catch((e) => {
		return { errors: [{message: e }]};
  });
}

/**
 * Signs download message
 * @param docId Document Id.
 */
async function signPublicKeyMessage(wallet) {
  const message = 'I accept GenoBank.ios terms and conditions.';
  signature = await wallet.signMessage(message);

  return {
    signature,
    signatureKind: 1
  }
}

/**
 * Sign consent claim.
 * @param wallet Wallet instance (ethers).
 * @param data Arbitrary JSON object.
 */
async function signConsent(wallet, claim) {
  const data = ethers.utils.keccak256(`0x${claim}`);
  const dataArray = ethers.utils.arrayify(data);
  const signature = await wallet.signMessage(dataArray);
  return signature;
}

/**
 * Encrypto conset data.
 * @param data Consent data.
 * @param publicKey Laboratory public key.
 */
async function encryptConsent(data, publicKey) {
	const eccryptoJS = window.eccryptoJS;
	const str = JSON.stringify(data);
	const msg = eccryptoJS.utf8ToBuffer(str);
	const pubKeyBuf = new Uint8Array(hexToString(publicKey.substr(2)));
	const encrypted = await eccryptoJS.encrypt(pubKeyBuf, msg).catch(console.error);
	const serialized = eccryptoJS.serialize(encrypted);
	return bufToHex(serialized);
    // const encrypted = eccryptoJS.deserialize(Buffer.from(encrypted, 'hex'));
	// const decrypted = await eccryptoJS.decrypt(keyPair.privateKey, encrypted);
}

/**
 * Encrypto data.
 * @param data Consent data.
 * @param publicKey Public key.
 */
async function encryptData(data, publicKey) {
  const eccryptoJS = window.eccryptoJS;
  const pubKeyBuf = new Uint8Array(hexToString(publicKey.substr(2)));
  const encrypted = await eccryptoJS.encrypt(pubKeyBuf, data).catch(console.error);
  const serialized = eccryptoJS.serialize(encrypted);
  return bufToHex(serialized);
}
  
/**
 * Retrieves consent form data.
 */
function getConsentData() {
  return {
	physicalId,
    fullName: $("#donor-name").val(),
    signatureImage: document.getElementById("jq-signature-canvas-1").toDataURL("image/png"),
    signatureDate: $("#signatureDate").val(),
    birthDate: $("#yob").val(),
    agreed: $("#agree").val(),
  }
}

/**
 * Uploads user's consent to the cloud.
 * @param physicalId physicalId
 * @param address User's wallet address.
 * @param permiteeId Laboratory's wallet address.
 * @param claim Encrypted consent data.
 * @param signature Signature (signed claim).
 */
async function uploadConsent(physicalId, address, permiteeAddress, claim, signature, metadata) {
	const str = JSON.stringify({ physicalId, address, claim, signature }, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
	const body  = new FormData();
	body.append('physicalId', physicalId);
	body.append('address', address);
	body.append('permitteeAddress', permiteeAddress);
	body.append('source', blob, 'consent.json');
  body.append('metadata', metadata);
	await fetch(`${window.API_BASE}/documents`, {
		method: 'POST',
		body,
	}).then((res) => {
		return res.json();
	});
}

function leftPad(input, chars, sign, prefix) {
  const hasPrefix = prefix === undefined ? /^0x/i.test(input) || typeof input === 'number' : prefix;
  input = input.toString(16).replace(/^0x/i, '');
  const padding = (chars - input.length + 1 >= 0) ? chars - input.length + 1 : 0;

  return (hasPrefix ? '0x' : '') + new Array(padding).join(sign ? sign : '0') + input;
}

function stringToHex(input) {
  return unescape(encodeURIComponent(input))
  .split('').map(function(v){
    return v.charCodeAt(0).toString(16)
  }).join('');
}

function hexToString(hexString) {
	return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function bufToHex(buffer) { // buffer is an ArrayBuffer
	return [...new Uint8Array(buffer)]
        .map (b => b.toString (16).padStart (2, "0"))
        .join ("");
}

async function claimBiosample() {
  const account = generateAddress;
  const biosampleIdHex = leftPad(parseInt(biosampleId), 12, '0', false);
  const permitteeIdHex = leftPad(parseInt(permiteeId), 12, '0', false);
  const tokenID = `0x${biosampleIdHex}${permitteeIdHex}${account.substr(2)}`;
  const seed = leftPad(new Date().getTime(), 64, '0', false);
  const claimData = `0x${stringToHex(`${window.NAMESPACE}.create`)}${tokenID.substring(2)}${seed}`;
  const data = ethers.utils.keccak256(claimData);
  const dataArray = ethers.utils.arrayify(data);
  const signature = await wallet.signMessage(dataArray);

	console.log(tokenID.substring(2))
	console.log(biosampleSecret)
	console.log(signature)
	console.log(seed)


// new implementation
	const response = await fetch(`${window.NEW_API_BASE}/claim/${tokenID.substring(2)}`, {
		method: 'POST',
		headers: {
			"Content-type": "application/json; charset=UTF-8"
		},
		body: JSON.stringify({
			biosampleSecret,	
			signature,
			seed,
			signatureKind: 1
			}),
		});
  
  return response.json()


}


$.fn.shuffle = function () {
	return this.each(function () {
		var items = $(this).children().clone(true);
		return (items.length) ? $(this).html($.shuffle(items)) : this;
	});
}

$.shuffle = function (arr) {
	for (var j, x, i = arr.length; i; j = parseInt(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x);
	return arr;
}

$('.murl a').attr('href', function (i, v) {
	return v + $('#mid').text();
});
var counter = 0;

const rollSound = new Audio("./assets/audio/dice.mp3");

//Count
$count = function () {
	counter++;
}

//GeneratePhrase+ Validate Phrase
$activatePhrase = function () {
	
	arrayPhrase = generatePhrase.split(" ");
	$('.randomphrase').empty();

	$(arrayPhrase).each(function (i, e) {
		$('.step3 .randomphrase').append('<li> <p class="btn-reorder"><span class="category xs mx-2 ">' + arrayPhrase[i] + '</span></p></li>');
	});
	$('.step3 .randomphrase').shuffle();
	
	$(arrayPhrase).each(function (i, e) {
		$('.step2 .passphrase').append('<li> <p ><span class="category xs mx-2 ">' + arrayPhrase[i] + '</span></p></li>');
	});
}

$checkSum = function () {
	//https://docs.ethers.io/v5/single-page/#/v5/api/utils/address/-%23-utils-getAddress

	// var checkAddress = ethers.utils.getAddress(generateAddress);
	// var fifthByte = ethers.utils.isHexString(checkAddress, [5]);

	// while (checkAddress) {
	// 	if ( fifthByte == 0x21 ) {
	// 		alert('Invalid Wallet Address');
	// 		return false;
	// 	}
		
	// }
	$activatePhrase();

 }
// $rotateLottiePhone = function () {
// 	let iconSkipForward = document.querySelector('.lottie-phone');

// 	let animationSkipForward = bodymovin.loadAnimation({
// 		container: iconSkipForward,
// 		renderer: 'svg',
// 		loop: true,
// 		autoplay: true,
// 		path: "js/phone.json"
// 	});
// }

// //lottie functions
// let params = {
// 	container: document.querySelector('.lottie-bar'),
// 		renderer: 'svg',
// 		loop: false,
// 		autoplay: false,
// 		path: "js/loadbar.json"
// 	}
// let animationSkipForward2 =  bodymovin.loadAnimation(params);

let params3 = {
	container: document.querySelector('.lottie-bar2'),
	renderer: 'svg',
	loop: false,
	autoplay: false,
	path: "js/loadbar.json"
}
let animationSkipForward4 = bodymovin.loadAnimation(params3);

let params2 = {
	container: document.querySelector('.lottie-success'),
	renderer: 'svg',
	loop: false,
	autoplay: false,
	path: "js/success.json"
}
let animationSkipForward3 = bodymovin.loadAnimation(params2);

//Rotate Phhone to generate phhrase
$readDeviceOrientation = function () {
		
	$(window).on("orientationchange", function () {
		
		if (Math.abs(window.orientation) === 90) {
			// Landscape
			$count();
			rollSound.play();
			$checkSum();
	
			animationSkipForward2.playSegments([0,59], true);

		} else {
			// Portrait
			$count();
			rollSound.play();
			$checkSum();
		
		}
		$checkCounter();
	});
}
//Check counter
$checkCounter = function () {
	if (counter >= 2) {
		
		$('.step1').hide();
		$('.step2').fadeIn();
		$(this).off();
		$(".btn-reorder").one("click", $handler1);

	}
}
//toggle passphrase buttons 
$handler1 = function () {
	$(this).closest('li').addClass('remove');
	$('.step3 .empty li:empty:first').append($(this));


	$(this).one("click", $handler2);
}

$handler2 = function () {
	$('.step3 .scramble li.remove').remove();

	$('.scramble').append($("<li>"));
	$(this).appendTo('.step3 .scramble li:last-child');
	$(this).one("click", $handler1);

}
	

clearInput = function () {

	$('input[type=text], textarea').each(function() {

		var default_value = this.value;

		$(this).focus(function(){
				if(this.value == default_value) {
						this.value = '';
				}
		});

		$(this).blur(function(){
				if(this.value == '') {
						this.value = default_value;
				}
		});

	});
}

	

//jQuery Timeline
$(async function () {

	$('.btn-restart').on("click", function (e){
	location.reload();
	});

	$('#signatureDate').val(signatureDate);

	$('.js-signature').jqSignature();
	$(".consent input").prop('required',true);
	clearInput();
	$('#randomVisitor').modal('show');
	checklabID();
	//Home - privacy scroll
	$('.sliding-link').on("click", function (e){
		e.preventDefault();
		var aid = $(this).attr('href');
		$('html,body').animate({ scrollTop: $(aid).offset().top }, 'slow');
	});

	// Check if the biosample has not beeen activated.
	await fetch(`${window.API_BASE}/biosamples/${biosampleId}`, {
		method: 'GET',
		headers: {
		"Content-type": "application/json; charset=UTF-8"
		},
	})
	.then(response => response.json())
	.then(data => {
		if (data.data) { // already exists
			$('#invalidKit').modal('show');
		}
	})
	.catch((error) => {
		alert('Error:', error);
		console.error('Error:', error);
	});

	$('.btn-gotoConsent').on("click", async function () {
		$('.home').hide();
		$('.consent').fadeIn();
	});

	$('.clearSign').on("click", function () {
		$('.js-signature').jqSignature('clearCanvas');
	});

	$('.btn-gotostepoptions').on("click", async function () { // agree with terms
		const data = getConsentData();
		const laboratory = await getLaboratory();
		if (!laboratory.data) {
			console.error("Error:", laboratory);
			alert('Invalid laboratory');
			return;
		}
    const publicKey = await getPublicKey(laboratory.data.owner);
    if (!publicKey.data) {
      console.error("Error:", publicKey);
			alert('Error with biosample activation: permittee did not register public key for file encryption. The permittee must contact the GenoBank.io administrator to complete this setup step.');
			return;
    }

		const claim = await encryptConsent(data, publicKey.data.key);
		const signature = await signConsent(wallet, claim); // sign form data
    const pkSignature = await signPublicKeyMessage(wallet);
    await createPublicKey(pkSignature.signature, pkSignature.signatureKind);

    const metadata = {
      fileName: 'consent.json',
      fileType: 'application/json'
    }
    const metadataToEncrypt = Buffer.from(JSON.stringify(metadata), 'utf8');
    const encryptedMetadata = await encryptData(metadataToEncrypt, publicKey.data.key);
		uploadConsent( // upload consent to the cloud
			physicalId,
			generateAddress,
			laboratory.data.owner,
			claim,
			signature,
      encryptedMetadata
		).then(() => { // continue
			$('.consent').hide();
			$('.stepOptions').fadeIn();
		}).catch((e) => { // unexpected error
			console.error("Error:", e);
		});
	});

	$('.btn-gotostep1').on("click", function () {
		$('.step0').hide();
		$('.step1').fadeIn();


	});



	$('.btn-gotoimportwallet').on("click", function () {
		$('.step0').hide();
		$('.importwallet').fadeIn();
		// document.body.requestFullscreen();
	});
	$('.btn-gotostep0').on("click", function () {
		$('.consent').hide();
		$('.step0').fadeIn();
		document.body.requestFullscreen();
	});




	//Step1 - create phras
	$('.btn-gotostep2').on("click", function () {
		$checkSum();
		$('.step1').hide();
		$('.step2').fadeIn();
		$(this).off();
		$(".btn-reorder").one("click", $handler1);

	});
	 //Step2 - put passphrase in order
	$('.btn-gotostep3').on("click", function () {
		$('.step2').hide();
		$('.step3').fadeIn()
	});

	// Step3 - Check passphrase order and send message to blockchain
	let step3_attempts = 0;
	$(".btn-gotostep4").on("click", async function () {
		arr1 = arrayPhrase;
		arr2 = [];

		$(async function() {
			$('.validatephrase li span').each(function () {
				arr2.push($(this).text());
			});

			var $matchArray = arr1.length == arr2.length && arr1.every(function (element, index) {
				return element === arr2[index];
			});

			if ($matchArray) {
				$('.step3').hide();
      	$('.step4').fadeIn();
      
				//Signing a message to blockcahin
				const data = await claimBiosample();
  				console.log("response: ",data)

				if (data.data) {
					const txHash1 = data.data.transactions[0].transactionHash;
					const txHash2 = data.data.transactions[1].transactionHash;
					
					animationSkipForward4.playSegments([0, 118], true);
					
					setTimeout(async function() {
						animationSkipForward3.playSegments([0, 29], true);	
						$('#tx').html(
							`<h3>Success! Kit is Activated</h3>
							<p>Do not lose your 12 word passphrase. It controls access to your biosample</p>
							<p class="text-center mt-3 mb-0"> View Transactions:  </p> 
							<a id="txLink" href="https://testnet.snowtrace.io//tx/${txHash1}" target="_blank">    
								<p class="text-center mb-3 tansaction">
								${txHash1}
								</p>
							</a>
							<a id="txLink" href="https://testnet.snowtrace.io/tx/${txHash2}" target="_blank">    
								<p class="text-center mb-3 tansaction">
								${txHash2}
								</p>
							</a>
						`);
					}, 2000);
				} else if (data.errors) {
          switch (data.errors[0].code) {
            case 400001:
              alert('Activation link invalid or revoked.');
              break;
            default:
              alert(data.errors[0].message);
          }
        } else {
          alert('Error');
        }
			} else if (step3_attempts >= 2) {
				step3_attempts = 0;
				alert('Sorry, wrong order. Please restart the activation process.');
				location = "/";
			} else {
				step3_attempts += 1;
				alert('Sorry, wrong order. Please try again.');
			}
		});
	});


	$(".btn-importwallet").on("click", async function () {
		$('.error-section').hide()
		arr2 = [];
		

		$(async function() {
			$('.validateimportedphrase li input').each(function () {
				arr2.push($(this).val());
			});
			try{
				mnemonicwords = arr2.join(' ');
				wallet = ethers.Wallet.fromMnemonic(mnemonicwords)
				generateAddress = wallet.address

				$('.importwallet').hide();
				$('.step4').fadeIn();
			
				//Signing a message to blockcahin
				const data = await claimBiosample();

				if (data.data) {
					const txHash1 = data.data.transactions[0].transactionHash;
					const txHash2 = data.data.transactions[1].transactionHash;
					
					animationSkipForward4.playSegments([0, 118], true);
					
					setTimeout(async function() {
						animationSkipForward3.playSegments([0, 29], true);	
						$('#tx').html(
							`<h3>Success! Kit is Activated</h3>
							<p>Do not lose your 12 word passphrase. It controls access to your biosample</p>
							<p class="text-center mt-3 mb-0"> View Transactions:  </p> 
							<a id="txLink" href="https://testnet.snowtrace.io//tx/${txHash1}" target="_blank">    
								<p class="text-center mb-3 tansaction">
								${txHash1}
								</p>
							</a>
							<a id="txLink" href="https://testnet.snowtrace.io/tx/${txHash2}" target="_blank">    
								<p class="text-center mb-3 tansaction">
								${txHash2}
								</p>
							</a>
						`);
					}, 2000);
				} else if (data.errors) {
					switch (data.errors[0].code) {
						case 400001:
							alert('Activation link invalid or revoked.');
							break;
						default:
							alert(data.errors[0].message);
					}
				} else {
					alert('Error');
				}


			}catch(e) {
				$('.error_message').html(e.message);
				$('.error-section').show()
				console.error(e);
			}


		});
	});

});
