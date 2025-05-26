# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{pkgs}: {
  # Which nixpkgs channel to use.
  channel = "stable-24.11"; # or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
    pkgs.postgresql   
    pkgs.devbox
    pkgs.sudo
  ];
  # Sets environment variables in the workspace
  env = {
    POSTGRESQL_CONN_STRING = "postgresql://user:dataharbour@localhost:5432/dataharbour_db?sslmode=disable";
  };
  services.postgres = { enable = true;};

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
      "mtxr.sqltools-driver-pg"
      ",xtr.sqltools"
    ];

    workspace = {
      onCreate = {
        default.openFiles = [
          "src/app/page.tsx" "READ.md"
        ];
        setup = ''
        initdb -d localhost
        psql --dbname=postgres -c "ALTER USER \"Dataharbour\" PASSWORD 'd&h$_628';"
        psql --dbname=postgres -c "CREATE DATABASE dataharbor_db;"
        psql --dbname=dharbour -f create.sql
        psql --dbname=dharbour -f upload.sql
        '';
      };
    };

    # Enable previews and customize configuration
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
          manager = "web";
        };
        };
        };
        };
}