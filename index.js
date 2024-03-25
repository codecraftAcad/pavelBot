const { Telegraf, Markup, Scenes, session } = require("telegraf");
const dotenv = require('dotenv').config()
const {faceSwap} = require('./swap')
const axios = require('axios');
const sharp = require('sharp');;


const botToken = process.env.BOT_TOKEN
console.log(botToken)
const bot = new Telegraf(botToken);

const faceSwapScene = new Scenes.BaseScene('faceSwapScene')

const stage = new Scenes.Stage([
    faceSwapScene
])
bot.use(session());
bot.use(stage.middleware());


const saveWebLogo = async (fileId) => {
    try {
        console.log('Requesting file link for file ID:', fileId);
        // Get the image link from Telegram
        const imageLink = await bot.telegram.getFileLink(fileId);
        console.log('Received image link:', imageLink);
        return imageLink;
    } catch (error) {
        console.error('Error processing image:', error.message);

        if (error.response && error.response.error_code === 401) {
            // Handle unauthorized error
            console.error('Unauthorized access. Check bot token and permissions.');
        }

        throw error;
    }
};

faceSwapScene.enter(async (ctx)=>{
    ctx.reply("Please send the target image")

    ctx.session.faceSwapData = {}
    ctx.session.faceSwapStep = 1
  })

  faceSwapScene.on("message", async (ctx) => {
    const currentStep = ctx.session.faceSwapStep || 1;

    switch (currentStep) {
        case 1:
            if (ctx.message.photo || ctx.message.document) {
                // Check if it's a photo
                if (ctx.message.photo) {
                    // Select the largest photo
                    const largestPhoto = ctx.message.photo.reduce((prev, current) => (prev.width > current.width) ? prev : current);
                    const targetImageFileId = largestPhoto.file_id;
                    ctx.session.faceSwapData.targetImage = targetImageFileId;
                    console.log('Received target image file:', targetImageFileId);
                    await ctx.reply('Target Image received', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "Swap Faces", callback_data: 'swap' }]
                            ]
                        }
                    });
                    ctx.session.faceSwapStep = 2;
                }
                // Check if it's a document (like a GIF)
                else if (ctx.message.document && ctx.message.document.mime_type.startsWith('video')) {
                    // Process GIF or video
                    const targetGifFileId = ctx.message.document.file_id;
                    ctx.session.faceSwapData.targetGif = targetGifFileId;
                    console.log('Received target GIF file:', targetGifFileId);
                    await ctx.reply('Target Image and Source Image received', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "Swap Faces", callback_data: 'swap' }]
                            ]
                        }
                    });
                    ctx.session.faceSwapStep = 2;
                } else {
                    ctx.reply('Error: Please send the target image or GIF as a photo or document.');
                }
            } else {
                ctx.reply('Error: Please send the target image or GIF as a photo or document.');
            }
            break;

        default:
            break;
    }
});




  faceSwapScene.action('swap', async(ctx) => {
    await ctx.reply('Processing...')
    const faceSwapData = ctx.session.faceSwapData;
    const targetImage = await saveWebLogo(faceSwapData.targetImage ? faceSwapData.targetImage : faceSwapData.targetGif);
    try{
        const swapFace = await faceSwap(targetImage);
               
        // Download the JPG image
        const response = await axios.get(swapFace, { responseType: 'arraybuffer' });
        const swapFaceBuffer = Buffer.from(response.data, 'binary');

        // Convert the image to PNG format with a transparent background
        const pngBuffer = await sharp(swapFaceBuffer)
            .resize({ width: 512, height: 512 }) // Resize if necessary
            .png({ compressionLevel: 9, adaptiveFiltering: true, progressive: true, quality: 100 })
            .toBuffer();

        // Obtain the file extension from metadata
        const metadata = await sharp(pngBuffer).metadata();
        const fileExtension = metadata.format;

        // Log the file extension
        console.log('File extension:', fileExtension);

        // Upload the converted image as a sticker
        const sticker = await ctx.telegram.uploadStickerFile(ctx.from.id, { source: pngBuffer }, 'static');

        // Reply with the sticker
        await ctx.replyWithSticker(sticker.file_id);
    }catch(error){
        console.log(error)
    }


 

    ctx.scene.leave();
});


bot.start((ctx)=>{
    ctx.reply("Hello welcome to pavel Face Swapper", {
        reply_markup:{
            inline_keyboard : [
                [{text: 'Face Swap', callback_data: 'swapface'},
            
            {text: ' Gif Face Swap', callback_data: 'gifSwap'}
        ]
            ]
        }
    })
})

bot.action('swapface', async (ctx)=>{
    ctx.scene.enter("faceSwapScene")
})



bot.launch({
    webhook: {
        domain: 'https://pavelbot.onrender.com',
        port: process.env.PORT || 3000,
    },
});