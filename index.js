const NodeWebcam = require("node-webcam");
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('node:fs');
const Gpio = require('onoff').Gpio;

// Configuração do GPIO
const pinIn = new Gpio(23, 'in'); // Pino de entrada (GPIO 23)

// Configurações da webcam
const webcamOptions = {
    width: 1280,
    height: 720,
    quality: 100,
    saveShots: true,
    output: "jpeg",
    device: 1,
    callbackReturn: "location",
    verbose: false
};

// Cria uma instância da webcam
const webcam = NodeWebcam.create(webcamOptions);

// Função para capturar a imagem com Promise
const takePicture = () => {
    return new Promise((resolve, reject) => {
        const imageName = `photo_${Date.now()}.jpeg`; // Nome da imagem com timestamp

        // Captura a imagem e salva no arquivo
        webcam.capture(imageName, function (err, data) {
            if (err) {
                console.error("Erro ao capturar a imagem:", err);
                reject(err); // Rejeita a Promise em caso de erro
            } else {
                console.log(`Imagem capturada e salva como: ${data}`);
                resolve(imageName); // Resolve a Promise com o nome da imagem
            }
        });
    });
};

// Inicializa o cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('ready', () => {
    console.log('Client is ready!');

    // Verifica continuamente o estado do pino
    let signalLost = false; // Flag para evitar múltiplas fotos para o mesmo evento

    setInterval(async () => {
        const signal = pinIn.readSync(); // Lê o estado do pino de entrada
        if (signal === 0 && !signalLost) { // Se o sinal for perdido (LOW)
            signalLost = true; // Define a flag para evitar repetição
            console.log('⚠️ Sinal perdido! Capturando e enviando foto...');
            try {
                const imgName = await takePicture(); // Captura a foto
                const media = await MessageMedia.fromFilePath(`./${imgName}`);
                await client.sendMessage('SEU_NUMERO_AQUI', media); // Substitua pelo número do destinatário
                fs.unlinkSync(`./${imgName}`); // Remove a imagem após o envio
            } catch (err) {
                console.error("Erro ao processar a imagem:", err);
            }
        } else if (signal === 1) {
            signalLost = false; // Restaura a flag quando o sinal volta
        }
    }, 500); // Verifica a cada 500ms
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.initialize();

// Tratamento de interrupção para encerrar o programa
process.on('SIGINT', () => {
    pinIn.unexport(); // Libera o controle do GPIO
    console.log("\nEncerrando...");
    process.exit();
});
