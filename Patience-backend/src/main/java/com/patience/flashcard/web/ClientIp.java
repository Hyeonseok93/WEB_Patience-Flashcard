package com.patience.flashcard.web;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * Prefer nginx {@code X-Real-IP} only when the immediate peer is a private hop
 * (docker network). Direct callers keep {@code getRemoteAddr()}.
 */
public final class ClientIp {

  private ClientIp() {}

  public static String of(HttpServletRequest request) {
    String remote = request.getRemoteAddr();
    String real = request.getHeader("X-Real-IP");
    if (real != null) {
      String trimmed = real.trim();
      if (isSingleAddress(trimmed) && isTrustedHop(remote)) {
        return trimmed;
      }
    }
    return remote == null || remote.isBlank() ? "unknown" : remote;
  }

  private static boolean isSingleAddress(String value) {
    if (value.isEmpty() || value.indexOf(',') >= 0 || value.indexOf(' ') >= 0) {
      return false;
    }
    try {
      InetAddress.getByName(value);
      return true;
    } catch (UnknownHostException ex) {
      return false;
    }
  }

  private static boolean isTrustedHop(String remote) {
    if (remote == null || remote.isBlank()) {
      return false;
    }
    try {
      InetAddress addr = InetAddress.getByName(remote);
      return addr.isLoopbackAddress() || addr.isSiteLocalAddress() || addr.isLinkLocalAddress();
    } catch (UnknownHostException ex) {
      return false;
    }
  }
}
