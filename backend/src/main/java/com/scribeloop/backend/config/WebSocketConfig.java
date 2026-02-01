package com.scribeloop.backend.config;

import com.scribeloop.backend.web.PingWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final PingWebSocketHandler pingWebSocketHandler;
    private final CorsProperties corsProperties;

    public WebSocketConfig(PingWebSocketHandler pingWebSocketHandler, CorsProperties corsProperties) {
        this.pingWebSocketHandler = pingWebSocketHandler;
        this.corsProperties = corsProperties;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(pingWebSocketHandler, "/ws")
                .setAllowedOrigins(corsProperties.getAllowedOrigins().toArray(new String[0]));
    }
}
