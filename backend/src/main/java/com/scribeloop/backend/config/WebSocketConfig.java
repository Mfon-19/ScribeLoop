package com.scribeloop.backend.config;

import com.scribeloop.backend.collab.CollaborationWebSocketHandler;
import com.scribeloop.backend.config.ws.WebSocketAuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final CollaborationWebSocketHandler collaborationWebSocketHandler;
    private final WebSocketAuthInterceptor webSocketAuthInterceptor;
    private final CorsProperties corsProperties;

    public WebSocketConfig(
            CollaborationWebSocketHandler collaborationWebSocketHandler,
            WebSocketAuthInterceptor webSocketAuthInterceptor,
            CorsProperties corsProperties
    ) {
        this.collaborationWebSocketHandler = collaborationWebSocketHandler;
        this.webSocketAuthInterceptor = webSocketAuthInterceptor;
        this.corsProperties = corsProperties;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(collaborationWebSocketHandler, "/ws")
                .addInterceptors(webSocketAuthInterceptor)
                .setAllowedOrigins(corsProperties.getAllowedOrigins().toArray(new String[0]));
    }
}
