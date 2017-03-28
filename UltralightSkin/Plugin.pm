package Plugins::UltralightSkin::Plugin;

use File::Basename;
use File::Spec::Functions qw(catfile catdir);

use constant SKIN_DIR => 'HTML/ultralight';

# this plugin registers the helper files (fonts, manifest) as raw downloads
# this will allow Logitech Media Server to serve those files without a patch
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
		if ($file =~ /\.(?:eot|svg|woff2?|ttf|json)$/) {
			$file = catfile($skinDir, $file);
			Slim::Web::Pages->addRawDownload(basename($file), $file, Slim::Music::Info::typeFromSuffix($file));
		}
	}
}

1;