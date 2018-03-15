import { flow } from "../Utils";

function somethingAsync() {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve, 2000);
    });
}

const run = flow(function*() {
    console.log(1);
    yield somethingAsync();
    console.log(2);
    yield somethingAsync();
});

const test = async () => {
    try {
        const a = run();
        setImmediate(() => {
            console.log("grahhh");
            a.cancel();
        });
        await a;
    } catch (error) {
        console.log("Found an error", error);
    } finally {
        console.log("It ends");
    }
};

test();
