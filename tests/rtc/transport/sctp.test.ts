import { RTCSctpTransport } from "../../../src";
import { dtlsTransportPair } from "./dtls.test";
import {
  RTCDataChannel,
  RTCDataChannelParameters,
} from "../../../src/rtc/dataChannel";

describe("RTCSctpTransportTest", () => {
  function trackChannels(transport: RTCSctpTransport) {
    const channels: RTCDataChannel[] = [];

    transport.datachannel.subscribe((channel) => {
      channels.push(channel);
    });

    return { channels, event: transport.datachannel };
  }

  async function waitForOutcome(
    client: RTCSctpTransport,
    server: RTCSctpTransport
  ) {
    await Promise.all([
      new Promise((r) => client.sctp.connected.subscribe(r)),
      new Promise((r) => server.sctp.connected.subscribe(r)),
    ]);
  }

  test("test_connect_then_client_creates_data_channel", async (done) => {
    const [clientTransport, serverTransport] = await dtlsTransportPair();

    const client = new RTCSctpTransport(clientTransport);
    const server = new RTCSctpTransport(serverTransport);

    await Promise.all([server.start(client.port), client.start(server.port)]);

    // wait for sctp connected
    await waitForOutcome(client, server);

    const serverChannels = trackChannels(server);
    serverChannels.event.subscribe((channel) => {
      channel.send(Buffer.from("ping"));
      channel.message.subscribe((data) => {
        expect(data.toString()).toBe("pong");
        done();
      });
    });

    const channel = new RTCDataChannel(
      client,
      new RTCDataChannelParameters({ label: "chat", id: 1 })
    );
    channel.message.subscribe((data) => {
      expect(data.toString()).toBe("ping");
      channel.send(Buffer.from("pong"));
    });
  });
});