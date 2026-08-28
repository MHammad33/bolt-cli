import readline from "node:readline";

console.log("⚡ Bolt is active");
console.log(`Working directory: ${process.cwd()}`);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function askForCommand() {
	rl.question("bolt > ", (command) => {
		if (command !== "/exit" && command !== "") {
			console.log(`You said: ${command}`);
		}

		if (command === "/exit") {
			console.log("Goodbye 👋");
			rl.close();
			return;
		}

		askForCommand();
	});
}

askForCommand();
