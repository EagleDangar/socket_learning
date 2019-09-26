const express = require("express");
const router = express.Router();


module.exports = function(io){
  router.get("/", (req, res) => {
      console.log("Here in socket Router Connected!!!");
      // console.log(io);
      io.on("hello", (deal_id , version_id , deal_out_name) => {
      console.log(` Deal ID :-  ${deal_id}  And  Version ID :- ${version_id}`);
      io.emit(
      "sendingModelProgress",
      "100%",
      "Finally"
    );
      
    });
    res.send({ response: "I am alive" }).status(200);
  });
  return router;
}



