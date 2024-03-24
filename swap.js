const { Prodia } = require("prodia.js");

const prodia = new Prodia("b822c146-da02-49dd-9d9d-1a9db97a0f9e")
const faceSwap = async ( target) => {
    const generate = await prodia.faceSwap({
        sourceUrl: "https://payspacemagazine.com/wp-content/uploads/2019/10/paveldurov.jpg",
        targetUrl: target,
    });

    while (generate.status !== "succeeded" && generate.status !== "failed") {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const job = await prodia.getJob(generate.job);

        if (job.status === "succeeded") {
            const upscaleGenerate = await prodia.faceRestore({
                imageUrl: job.imageUrl,
            });

            while (upscaleGenerate.status !== "succeeded" && upscaleGenerate.status !== "failed") {
                await new Promise((resolve) => setTimeout(resolve, 250));
                const upscaleJob = await prodia.getJob(upscaleGenerate.job);

                if (upscaleJob.status === "succeeded") {
                    console.log("Upscaled", upscaleJob);
                    return upscaleJob.imageUrl;
                }
            }
            console.log("Upscaled", upscaleJob);
            return upscaleJob.imageUrl;
        }
    }

    console.log("Face swapped", job);
    return job.imageUrl;
};


module.exports ={
    faceSwap
}