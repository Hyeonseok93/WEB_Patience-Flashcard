package com.patience.flashcard.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ClientIpTest {

  @Mock HttpServletRequest request;

  @Test
  void usesRealIpWhenPeerIsDockerNetwork() {
    when(request.getRemoteAddr()).thenReturn("172.18.0.4");
    when(request.getHeader("X-Real-IP")).thenReturn("203.0.113.10");
    assertThat(ClientIp.of(request)).isEqualTo("203.0.113.10");
  }

  @Test
  void ignoresRealIpFromPublicPeer() {
    when(request.getRemoteAddr()).thenReturn("203.0.113.1");
    when(request.getHeader("X-Real-IP")).thenReturn("1.2.3.4");
    assertThat(ClientIp.of(request)).isEqualTo("203.0.113.1");
  }

  @Test
  void ignoresCommaSeparatedSpoof() {
    when(request.getRemoteAddr()).thenReturn("172.18.0.4");
    when(request.getHeader("X-Real-IP")).thenReturn("1.2.3.4, 5.6.7.8");
    assertThat(ClientIp.of(request)).isEqualTo("172.18.0.4");
  }
}
