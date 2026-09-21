const makeWASocket = jest.fn();

module.exports = {
  __esModule: true,
  default: makeWASocket,
  DisconnectReason: {
    loggedOut: 401,
  },
  useMultiFileAuthState: jest.fn(),
};
