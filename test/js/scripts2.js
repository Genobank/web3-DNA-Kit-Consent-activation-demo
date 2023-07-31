
var pageURL = $(location).attr("href");
var biosampleId = null;
emptyUrl = window.location.href.indexOf('?')
$emailLink = $("a.btn-register").attr("href");

/**
 * Checks if the provided biosample ID already exists.
 */


 $('input, textarea').each(function() {

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
  
  
$checkOwner = async function (biosampleId) {
    await fetch(`${window.API_BASE}/biosamples/${biosampleId}`, {
        method: 'GET',
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        },
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.data.owner) { // already exists
          // TODO
        } else { // continue
          $('#invalidError').modal('show');
        }
      })
      .catch((error) => {
        
        $('#invalidError').modal('show');
        console.error('Error:', error);
      });
	}

$checkurl = function () {
	if (emptyUrl == -1) {

	}  else {
		$('#invalidError').modal('hide');

    parts = pageURL.split("?")[1].split("#");
    parts = parts[0].split("&");
    biosampleId = parts[0].split("=")[1];
    timestamp = parts[1].split("=")[1];
    signature = parts[2].split("=")[1];
		$('#biosample').append(biosampleId);
	} 
}

$clearFields = function () {
  $('input, textarea').each(function() {

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

$(function () {

  
   $('.input-email').on('blur', function(){

        var $email = $('input.input-email').val()
        //check if last name is there
        if($email.length !== 0){
            var link = 'index2.html?email='+ $email ;
            $('a.btn-register').attr('href',link);
     }
  });
  // Parse querystring and its parameters.
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const biosampleId = urlParams.get('biosampleId');
  const timestamp = urlParams.get('timestamp');
  const signature = urlParams.get('signature');

  // Perform actions.
  $checkOwner(biosampleId);
  $checkurl();
  $verifySignature(signature, biosampleId, timestamp); // TODO
});

/**
 * Extracts a wallet address from the signature.
 * @param signature Raw signature.
 * @param biosampleId Biosample ID (needed for claim).
 * @param timestamp Timestamp number (needed for claim).
 */
function $verifySignature(signature, biosampleId, timestamp) {
  biosampleId = leftPad(parseInt(biosampleId), 12, '0', false);
  const label = "io.genobank.io.test.login-third-party|laboratory-asombroso";
  const claimData = `0x${biosampleId}${timestamp}${stringToHex(label)}`;
  const data = ethers.utils.keccak256(claimData);
  const address = ethers.utils.recoverAddress(data, signature);
  console.log("Signature address:", address); // TODO
}

/**
 * Converts the provided input into HEX.
 * 
 * @param input Arbitrary string.
 */
function stringToHex(input) {
  return unescape(encodeURIComponent(input))
    .split('').map(function(v) {
      return v.charCodeAt(0).toString(16)
    }).join('');
}

/**
 * Adds left padding to the inoput.
 * 
 * @param input Arbitrary string.
 */
function leftPad(input, chars, sign, prefix) {
  const hasPrefix = prefix === undefined
    ? /^0x/i.test(input) || typeof input === 'number'
    : prefix;

  input = input.toString(16).replace(/^0x/i, '');

  const padding = (chars - input.length + 1 >= 0)
    ? chars - input.length + 1
    : 0;

  return (hasPrefix ? '0x' : '') + new Array(padding).join(sign ? sign : '0') + input;
}
