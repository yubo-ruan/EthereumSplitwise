// =============================================================================
//                                  Config
// =============================================================================

let web3 = new Web3(Web3.givenProvider || "ws://localhost:8545");

// Constant we use later
var GENESIS = '0x0000000000000000000000000000000000000000000000000000000000000000';



// This is the ABI for your contract (get it from Remix, in the 'Compile' tab)
// ============================================================
var abi = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "creditor",
				"type": "address"
			},
			{
				"internalType": "uint32",
				"name": "amount",
				"type": "uint32"
			}
		],
		"name": "add_IOU",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "debtor",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "creditor",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint32",
				"name": "amount",
				"type": "uint32"
			}
		],
		"name": "new_IOU",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "cycle",
				"type": "address[]"
			},
			{
				"internalType": "uint32",
				"name": "_min",
				"type": "uint32"
			}
		],
		"name": "resolveCycle",
		"outputs": [
			{
				"internalType": "bool",
				"name": "ret",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "debtor",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "creditor",
				"type": "address"
			}
		],
		"name": "lookup",
		"outputs": [
			{
				"internalType": "uint32",
				"name": "ret",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "debtor",
				"type": "address"
			}
		],
		"name": "viewTotalOwed",
		"outputs": [
			{
				"internalType": "uint32",
				"name": "ret",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]; // FIXME: fill this in with your contract's ABI //Be sure to only have one array, not two

// ============================================================
abiDecoder.addABI(abi);
// call abiDecoder.decodeMethod to use this - see 'getAllFunctionCalls' for more

var contractAddress = '0xeBE96619DA40d957F844B593343B240307D5B173'; // FIXME: fill this in with your contract's address/hash
var BlockchainSplitwise = new web3.eth.Contract(abi, contractAddress);

// =============================================================================
//                            Functions To Implement
// =============================================================================



async function getEvents() {
	BlockchainSplitwise.getPastEvents('new_IOU', function(error, events){  
		console.log(events[0]["returnValues"])
		var debtor = events[0]["returnValues"]["debtor"]
		var credit = events[0]["returnValues"]["credit"]
		var amount = events[0]["returnValues"]["amount"]
		return [debtor,credit,amount];
	});
	
	return ["debtor,credit,amount"];

	
	
}

// TODO: Add any helper functions here!

// TODO: Return a list of all users (creditors or debtors) in the system
// You can return either:
//   - a list of everyone who has ever sent or received an IOU
// OR
//   - a list of everyone currently owing or being owed money
async function getUsers() {
	let users = new Set();
	var receipt = await getAllFunctionCalls(contractAddress,"add_IOU");
	receipt.forEach(val => {
		var debtor = val["from"];
		var creditor = "0x"+val["input"].substr(34,40);
 		users.add(debtor);						
 		users.add(creditor);     
 		
	});

	return Array.from(users);
}

// TODO: Get the total amount owed by the user specified by 'user'
async function getTotalOwed(user) {

	var result = parseInt(await BlockchainSplitwise.methods.viewTotalOwed(user).call({from: web3.eth.defaultAccount}));
	return result;
}

// TODO: Get the last time this user has sent or received an IOU, in seconds since Jan. 1, 1970
// Return null if you can't find any activity for the user.
// HINT: Try looking at the way 'getAllFunctionCalls' is written. You can modify it if you'd like.
async function getLastActive(user) {
	var lastTime = null;
	var receipt = await getAllFunctionCalls(contractAddress,"add_IOU");
	receipt.forEach(val => {
		var debtor = val["from"];
		var creditor = "0x"+val["input"].substr(34,40);
 		if(debtor == user.toLowerCase() || creditor == user.toLowerCase()){
 			if(val["t"] > lastTime){
 				lastTime = val["t"];
 			}
 		}
	});
	return lastTime;
}

// Look at the IOU amount from the debtor and creditor
async function lookup(debtor, creditor) {

	var result = parseInt(await BlockchainSplitwise.methods.lookup(debtor,creditor).call({from: web3.eth.defaultAccount}));
	return result;
}

// getNeighbors takes a node (string) and returns its neighbors (as an array)
async function getNeighbors(node){

	let neighbors = new Set();
	var receipt = await getAllFunctionCalls(contractAddress,"add_IOU");
	receipt.forEach(val => {
		if(val["from"] == node.toLowerCase()){     
			var creditor = "0x"+val["input"].substr(34,40);
			neighbors.add(creditor);     	
		}
	});

	return Array.from(neighbors);

}

// TODO: add an IOU ('I owe you') to the system
// The person you owe money is passed as 'creditor'
// The amount you owe them is passed as 'amount'
async function add_IOU(creditor, amount) {


	var receipt = await BlockchainSplitwise.methods.add_IOU(creditor, amount).send({from: web3.eth.defaultAccount});

	var path = await doBFS(creditor,web3.eth.defaultAccount);  	//check if there is a path from creditor to debtor
	if(path != null){											//find a cycle
		path.push(creditor);        							//add the begining node
		var IOUs = [];
		for (let i = 0; i < path.length-1; i++) {				//loop through the IOU cycle
	 		 IOUs[i] = await lookup(path[i],path[i+1]);		
		}
		var min = Math.min.apply(null, IOUs)
		if(min != 0){
			await BlockchainSplitwise.methods.resolveCycle(path, min).send({from: web3.eth.defaultAccount});	
		}
	}
}

// =============================================================================
//                              Provided Functions
// =============================================================================
// Reading and understanding these should help you implement the above

// This searches the block history for all calls to 'functionName' (string) on the 'addressOfContract' (string) contract
// It returns an array of objects, one for each call, containing the sender ('from'), arguments ('args'), and the timestamp ('t')
async function getAllFunctionCalls(addressOfContract, functionName) {
	var curBlock = await web3.eth.getBlockNumber();
	var function_calls = [];

	while (curBlock !== GENESIS) {
	  var b = await web3.eth.getBlock(curBlock, true);
	  var txns = b.transactions;
	  for (var j = 0; j < txns.length; j++) {
	  	var txn = txns[j];

	  	// check that destination of txn is our contract
			if(txn.to == null){continue;}
	  	if (txn.to.toLowerCase() === addressOfContract.toLowerCase()) {
	  		var func_call = abiDecoder.decodeMethod(txn.input);

				// check that the function getting called in this txn is 'functionName'
				if (func_call && func_call.name === functionName) {
					var time = await web3.eth.getBlock(curBlock);
	  			var args = func_call.params.map(function (x) {return x.value});
	  			
	  			function_calls.push({
	  				from: txn.from.toLowerCase(),
	  				input: txn.input,
	  				args: args,
						t: time.timestamp
	  			})
	  		}
	  	}
	  }
	  curBlock = b.parentHash;
	}
	return function_calls;
}

// We've provided a breadth-first search implementation for you, if that's useful
// It will find a path from start to end (or return null if none exists)
// You just need to pass in a function ('getNeighbors') that takes a node (string) and returns its neighbors (as an array)
async function doBFS(start, end) {
	var queue = [[start]];
	while (queue.length > 0) {
		var cur = queue.shift();
		var lastNode = cur[cur.length-1]
		if (lastNode.toLowerCase() === end.toLowerCase()) {
			return cur;
		} else {
			var neighbors = await getNeighbors(lastNode);
			for (var i = 0; i < neighbors.length; i++) {
				queue.push(cur.concat([neighbors[i]]));
			}
		}
	}
	return null;
}

// =============================================================================
//                                      UI
// =============================================================================

// This sets the default account on load and displays the total owed to that
// account.
web3.eth.getAccounts().then((response)=> {
	web3.eth.defaultAccount = response[0];

	getTotalOwed(web3.eth.defaultAccount).then((response)=>{
		$("#total_owed").html("$"+response);
	});

	getLastActive(web3.eth.defaultAccount).then((response)=>{
		time = timeConverter(response)
		$("#last_active").html(time)
	});
});

// This code updates the 'My Account' UI with the results of your functions
$("#myaccount").change(function() {
	web3.eth.defaultAccount = $(this).val();

	getTotalOwed(web3.eth.defaultAccount).then((response)=>{
		$("#total_owed").html("$"+response);
	})

	getLastActive(web3.eth.defaultAccount).then((response)=>{
		time = timeConverter(response)
		$("#last_active").html(time)
	});
});

// Allows switching between accounts in 'My Account' and the 'fast-copy' in 'Address of person you owe
web3.eth.getAccounts().then((response)=>{
	var opts = response.map(function (a) { return '<option value="'+
			a.toLowerCase()+'">'+a.toLowerCase()+'</option>' });
	$(".account").html(opts);
	$(".wallet_addresses").html(response.map(function (a) { return '<li>'+a.toLowerCase()+'</li>' }));
});

// This code updates the 'Users' list in the UI with the results of your function
getUsers().then((response)=>{
	$("#all_users").html(response.map(function (u,i) { return "<li>"+u+"</li>" }));
});

getEvents().then((response)=>{
	$("#all_events").html(response.map(function (u,i) { return "<li>"+u+"</li>" }));
});

// This runs the 'add_IOU' function when you click the button
// It passes the values from the two inputs above
$("#addiou").click(function() {
	web3.eth.defaultAccount = $("#myaccount").val(); //sets the default account
  add_IOU($("#creditor").val(), $("#amount").val()).then((response)=>{
		window.location.reload(true); // refreshes the page after add_IOU returns and the promise is unwrapped
	})
});

// This is a log function, provided if you want to display things to the page instead of the JavaScript console
// Pass in a discription of what you're printing, and then the object to print
function log(description, obj) {
	$("#log").html($("#log").html() + description + ": " + JSON.stringify(obj, null, 2) + "\n\n");
}


// =============================================================================
//                                      TESTING
// =============================================================================

// This section contains a sanity check test that you can use to ensure your code
// works. We will be testing your code this way, so make sure you at least pass
// the given test. You are encouraged to write more tests!

// Remember: the tests will assume that each of the four client functions are
// async functions and thus will return a promise. Make sure you understand what this means.

function check(name, condition) {
	if (condition) {
		console.log(name + ": SUCCESS");
		return 3;
	} else {
		console.log(name + ": FAILED");
		return 0;
	}
}

async function sanityCheck() {
	console.log ("\nTEST", "Simplest possible test: only runs one add_IOU; uses all client functions: lookup, getTotalOwed, getUsers, getLastActive");

	var score = 0;

	var accounts = await web3.eth.getAccounts();
	web3.eth.defaultAccount = accounts[0];

	var users = await getUsers();
	score += check("getUsers() initially empty", users.length === 0);

	var owed = await getTotalOwed(accounts[0]);
	score += check("getTotalOwed(0) initially empty", owed === 0);

	var lookup_0_1 = await BlockchainSplitwise.methods.lookup(accounts[0], accounts[1]).call({from:web3.eth.defaultAccount});
	score += check("lookup(0,1) initially 0", parseInt(lookup_0_1, 10) === 0);

	var response = await add_IOU(accounts[1], "10");

	users = await getUsers();
	score += check("getUsers() now length 2", users.length === 2);

	owed = await getTotalOwed(accounts[0]);
	score += check("getTotalOwed(0) now 10", owed === 10);

	lookup_0_1 = await BlockchainSplitwise.methods.lookup(accounts[0], accounts[1]).call({from:web3.eth.defaultAccount});
	score += check("lookup(0,1) now 10", parseInt(lookup_0_1, 10) === 10);

	var timeLastActive = await getLastActive(accounts[0]);
	var timeNow = Date.now()/1000;
	var difference = timeNow - timeLastActive;
	score += check("getLastActive(0) works", difference <= 60 && difference >= -3); // -3 to 60 seconds

	console.log("Final Score: " + score +"/21");
}

//sanityCheck() //Uncomment this line to run the sanity check when you first open index.html
