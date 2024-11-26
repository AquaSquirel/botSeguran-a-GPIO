const NodeWebcam = require("node-webcam");
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('node:fs');
const Gpio = require('pigpio').Gpio;

// Configuração do GPIO
const pinIn = new Gpio(23, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_OFF,
});

// Configurações da webcam
const webcamOptions = {
    width: 1280,
    height: 720,
    quality: 100,
    saveShots: true,
    output: "jpeg",
    device: 1,
    callbackReturn: "location",
    verbose: false,
};

const webcam = NodeWebcam.create(webcamOptions);

const takePicture = () => {
    return new Promise((resolve, reject) => {
        const imageName = `photo_${Date.now()}.jpeg`;

        webcam.capture(imageName, function (err, data) {
            if (err) {
                console.error("Erro ao capturar a imagem:", err);
                reject(err);
            } else {
                console.log(`Imagem capturada e salva como: ${data}`);
                resolve(imageName);
            }
        });
    });
};

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('ready', () => {
    console.log('Client is ready!');

    let signalLost = false;

    setInterval(async () => {
        const signal = pinIn.digitalRead(); // Lê o estado do pino
        if (signal === 0 && !signalLost) {
            signalLost = true;
            console.log('⚠️ Sinal perdido! Capturando e enviando foto...');
            try {
                const imgName = await takePicture();
                const media = await MessageMedia.fromFilePath(`./${imgName}`);
                await client.sendMessage('SEU_NUMERO_AQUI', media);
                fs.unlinkSync(`./${imgName}`);
            } catch (err) {
                console.error("Erro ao processar a imagem:", err);
            }
        } else if (signal === 1) {
            signalLost = false;
        }
    }, 500);
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.initialize();

process.on('SIGINT', () => {
    console.log("\nEncerrando...");
    process.exit();
});
