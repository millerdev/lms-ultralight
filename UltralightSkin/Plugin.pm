package Plugins::UltralightSkin::Plugin;

use File::Basename;
use File::Spec::Functions qw(catfile catdir);

use constant SKIN_DIR => 'HTML/ultralight';

# this plugin registers the helper files (fonts, manifest) as raw downloads as
# well as extra paths, which will allow Logitech Media Server to serve those
# files without a patch
sub initPlugin {
	my $baseDir = dirname($INC{'Plugins/UltralightSkin/Plugin.pm'});
	my $skinDir = catdir($baseDir, SKIN_DIR);
	
	opendir(DIR, $skinDir) || do {
		Slim::Utils::Log::logError('UltralightSkin: failed to read base folder with fonts');
		return;
	};

	my @entries = readdir(DIR);

	close(DIR);

	for my $file (@entries) {
		# extend the list of file extensions if needed
		if ($file =~ /\.(?:eot|svg|woff2?|ttf|json|mp3)$/) {
			$file = catfile($skinDir, $file);
			Slim::Web::Pages->addRawDownload(basename($file), $file, Slim::Music::Info::typeFromSuffix($file));
		}
	}

	# menu handler
	my $indexFile = catfile($skinDir, "index.html");
	Slim::Web::Pages->addPageFunction(qr/^menu(\/.*)?$/, sub {
		return Slim::Web::HTTP::getStaticContent($indexFile);
	});
}

1;