// server/src/controllers/driverChatController.js
const driverSupportService = require("../services/driverSupportService");

const getMessages = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const result = await driverSupportService.getDriverMessages(driverId);
    await driverSupportService.markDriverRead(driverId, "admin").catch(() => {});
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const { message, order_id, delivery_id, enable_ai = true } = req.body;
    const result = await driverSupportService.sendDriverMessage(
      driverId,
      message,
      null, // sender is driver
      { order_id, delivery_id, enable_ai }
    );
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getReferenceOptions = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    const result = await driverSupportService.getDriverReferenceOptions(driverId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const driverId = req.driver.id;
    await driverSupportService.markDriverRead(driverId, "admin");
    res.json({ success: true, message: "Messages marked as read" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  getReferenceOptions,
  markAsRead,
};
