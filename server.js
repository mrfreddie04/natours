const dotenv = require('dotenv');
const mongoose = require('mongoose');
const app = require('./app');

process.env.NODE_ENV = process.env.NODE_ENV || app.get('env');

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: './config.prod.env' });
} else {
  dotenv.config({ path: './config.env' });
}

console.log('Environment: ', process.env.NODE_ENV);

let db;
let server;

const stop = async (exit=true) => {
  try {
    if(db && db.readyState === 1) {
      await db.disconnect();      
      console.log("DB disconnected");      
    }      
    if(server) {
      await server.close();
      console.log("Express stopped");
    }  
  } finally {
    if(exit) process.exit(1);
  } 
}

const start = async () => {
  try {
    //mongodb
    // eslint-disable-next-line camelcase
    const cn_str = process.env.DATABASE.replace(
      '<PASSWORD>',
      process.env.DATABASE_PASSWORD
    );
    db = await mongoose.connect(cn_str, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    const { name: cnname, host: cnhost, port: cnport } = db.connections[0];
    console.log(`Connected to mongoDB: ${cnname}. Host: ${cnhost}:${cnport}`);

    console.log(`Current path: ${process.cwd()}`);

    //express
    const port = process.env.PORT || 3000;
    server = app.listen(port, () => {
      console.log(`Listening on port: ${port}`);
    });

  } catch (err) {
    console.log("STARTUP ERROR: ", err.name, err.message);
    await stop();
  }
};

process.on("unhandledRejection", (err)=>{
  console.log("UNHANDLED REJECTION: ", err.name, err.message);
  stop();
});

process.on("uncaughtException", (err) => {
  console.log("UNHANDLED EXCEPTION: ", err.name, err.message);
  stop();  
})

process.on("SIGTERM", () => {
  console.log("SIGTERM RECEIVED. Shutting down gracefully");
  stop(false); //do not have to call process.exit()
});

start();
console.log('Server is starting...');


