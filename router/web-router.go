package router

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

// ThemeAssets holds the embedded frontend assets for both themes.
type ThemeAssets struct {
	DefaultBuildFS   embed.FS
	DefaultIndexPage []byte
	ClassicBuildFS   embed.FS
	ClassicIndexPage []byte
	ApiDocsBuildFS   embed.FS
}

func SetWebRouter(router *gin.Engine, assets ThemeAssets) {
	defaultFS := common.EmbedFolder(assets.DefaultBuildFS, "web/default/dist")
	classicFS := common.EmbedFolder(assets.ClassicBuildFS, "web/classic/dist")
	themeFS := common.NewThemeAwareFS(defaultFS, classicFS)

	// Serve the API documentation page at /docs
	setApiDocsRouter(router, assets.ApiDocsBuildFS)

	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())
	router.Use(static.Serve("/", themeFS))
	router.NoRoute(func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") || strings.HasPrefix(c.Request.RequestURI, "/assets") || strings.HasPrefix(c.Request.RequestURI, "/docs") {
			controller.RelayNotFound(c)
			return
		}
		c.Header("Cache-Control", "no-cache")
		if common.GetTheme() == "classic" {
			c.Data(http.StatusOK, "text/html; charset=utf-8", assets.ClassicIndexPage)
		} else {
			c.Data(http.StatusOK, "text/html; charset=utf-8", assets.DefaultIndexPage)
		}
	})
}

// setApiDocsRouter serves the API documentation SPA at /docs
func setApiDocsRouter(router *gin.Engine, apiDocsFS embed.FS) {
	subFS, err := fs.Sub(apiDocsFS, "web/api-documentation/dist")
	if err != nil {
		common.SysLog("api-documentation dist not found, /docs will not be available")
		return
	}
	fileServer := http.FileServer(http.FS(subFS))

	router.GET("/docs", func(c *gin.Context) {
		c.Request.URL.Path = "/index.html"
		fileServer.ServeHTTP(c.Writer, c.Request)
	})
	router.GET("/docs/*filepath", func(c *gin.Context) {
		c.Request.URL.Path = "/" + c.Param("filepath")
		if c.Request.URL.Path == "/" {
			c.Request.URL.Path = "/index.html"
		}
		fileServer.ServeHTTP(c.Writer, c.Request)
	})
}
